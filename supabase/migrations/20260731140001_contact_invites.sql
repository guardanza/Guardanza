-- Tanda B, Paso 4: invitaciones (token propio, hasheado).
--
-- Token propio en vez de inviteUserByEmail nativo de Supabase — decisión
-- ya tomada y explicada en la revisión del plan: (1) el TTL de los emails
-- nativos de Auth es un solo knob global, compartido con recovery/magic
-- link, no podemos darle 7 días a esto sin dárselos también a
-- "Olvidé mi contraseña"; (2) inviteUserByEmail crea auth.users en el
-- momento de invitar, no cuando la persona acepta — rompería el invariante
-- del Paso 3 (contact_target_role / la regla una-cuenta-un-rol asume que
-- "existe cuenta" == "la persona ya se registró de verdad"); (3) reenviar
-- es awkward en GoTrue una vez que el usuario ya existe.
--
-- Hasheado igual que una contraseña: la tabla guarda invite_token_hash
-- (sha256 del token crudo), nunca el token en sí. El token crudo sale una
-- sola vez de issue_contact_invite() — el que lo llama lo usa para armar
-- el link del email y lo descarta; no hay ninguna forma de recuperarlo
-- desde la base después. Un dump de la base no expone tokens válidos.
alter table public.contacts
  add column invite_token_hash bytea,
  add column invite_expires_at timestamptz,
  add column invited_at timestamptz;

-- Único activo por ficha (no guardamos historial de tokens viejos — el
-- UPDATE de un reenvío simplemente pisa el hash anterior) y el índice que
-- hace rápido el lookup por hash en el momento de aceptar (Paso 5).
create unique index contacts_invite_token_hash_key on public.contacts (invite_token_hash) where invite_token_hash is not null;

-- issue_contact_invite: única función para emitir Y reenviar (son la
-- misma operación — generar un token nuevo y pisar el anterior). Se llama
-- una vez al cargar una ficha por el camino 1 (sin cuenta) y de nuevo
-- cada vez que se aprieta "Reenviar".
--
-- p_target_user_id: resuelto en TypeScript (igual que en load_contact),
-- null en la emisión inicial. En un reenvío SÍ se resuelve de nuevo,
-- porque puede haber pasado cualquier cosa desde que se cargó la ficha —
-- la persona pudo haberse registrado por su cuenta mientras tanto. Si ya
-- existe cuenta:
--   - mismo rol (o la cuenta todavía no tiene ningún rol asentado, mismo
--     criterio que load_contact): se vincula directo ahí mismo, sin
--     mandar otro correo — ya no hace falta invitarla.
--   - rol distinto, o es una cuenta de platform admin: se rechaza con el
--     mismo error contact_role_mismatch del camino 3. Nunca se vincula a
--     una persona con un rol que no coincide, sea la primera carga o un
--     reenvío — la regla una-cuenta-un-rol no tiene puerta lateral acá.
--
-- Devuelve el token CRUDO solo cuando linked = false — es la única vez
-- que existe fuera de la memoria de esta función; TypeScript lo usa para
-- armar el link del email y nunca lo persiste tampoco.
create or replace function public.issue_contact_invite(p_contact_id uuid, p_target_user_id uuid default null)
returns table (contact_id uuid, linked boolean, raw_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_organization_id uuid;
  v_status public.contact_status;
  v_contact_role public.contract_role;
  v_invited_at timestamptz;
  v_target_role public.contract_role;
  v_raw_token text;
  v_expires_at timestamptz;
begin
  select organization_id, status, contact_role, invited_at
    into v_organization_id, v_status, v_contact_role, v_invited_at
  from public.contacts where id = p_contact_id;

  if v_organization_id is null then
    raise exception 'contact % not found', p_contact_id;
  end if;

  if not public.is_org_admin(v_organization_id, auth.uid()) then
    raise exception 'user % is not authorized to invite for contact %', auth.uid(), p_contact_id;
  end if;

  if v_status <> 'pendiente' then
    raise exception 'contact % is not pendiente, cannot invite', p_contact_id;
  end if;

  if p_target_user_id is not null then
    if public.is_platform_admin(p_target_user_id) then
      raise exception 'contact_role_mismatch: target account is a platform admin, not a marketplace role';
    end if;

    v_target_role := public.contact_target_role(p_target_user_id);
    if v_target_role is not null and v_target_role <> v_contact_role then
      raise exception 'contact_role_mismatch: target account already has role %, cannot load as %', v_target_role, v_contact_role;
    end if;

    update public.contacts
      set status = 'confirmado',
          user_id = p_target_user_id,
          confirmed_at = now(),
          invite_token_hash = null,
          invite_expires_at = null
      where id = p_contact_id;

    insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(), 'contact.linked', 'contact', p_contact_id,
      jsonb_build_object('organization_id', v_organization_id, 'user_id', p_target_user_id, 'contact_role', v_contact_role, 'via', 'resend')
    );

    return query select p_contact_id, true, null::text, null::timestamptz;
    return;
  end if;

  -- Anti-spam: no reemitir más de una vez por minuto — cubre doble click
  -- y reenvíos impacientes sin bloquear un reenvío legítimo más tarde.
  if v_invited_at is not null and v_invited_at > now() - interval '60 seconds' then
    raise exception 'resend_cooldown: wait before resending an invite for contact %', p_contact_id;
  end if;

  v_raw_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '7 days';

  update public.contacts
    set invite_token_hash = digest(v_raw_token, 'sha256'),
        invite_expires_at = v_expires_at,
        invited_at = now()
    where id = p_contact_id;

  return query select p_contact_id, false, v_raw_token, v_expires_at;
end;
$$;

grant execute on function public.issue_contact_invite(uuid, uuid) to authenticated;
