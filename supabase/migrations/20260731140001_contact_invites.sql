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
-- cada vez que se aprieta "Reenviar". Devuelve el token CRUDO — es la
-- única vez que existe fuera de la memoria de esta función; TypeScript lo
-- usa para armar el link del email y nunca lo persiste tampoco.
create or replace function public.issue_contact_invite(p_contact_id uuid)
returns table (contact_id uuid, raw_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_organization_id uuid;
  v_status public.contact_status;
  v_raw_token text;
  v_expires_at timestamptz;
begin
  select organization_id, status into v_organization_id, v_status
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

  v_raw_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '7 days';

  update public.contacts
    set invite_token_hash = digest(v_raw_token, 'sha256'),
        invite_expires_at = v_expires_at,
        invited_at = now()
    where id = p_contact_id;

  return query select p_contact_id, v_raw_token, v_expires_at;
end;
$$;

grant execute on function public.issue_contact_invite(uuid) to authenticated;
