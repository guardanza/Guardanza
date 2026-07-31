-- Tanda B, Paso 5: confirmación del invitado.
--
-- role_conflict_at: NO es un tercer valor del enum contact_status — sigue
-- siendo 'pendiente'. Es una anotación de "el último intento de confirmar
-- chocó con la regla una-cuenta-un-rol" (spec: la ficha queda marcada
-- "no se pudo vincular, rol distinto"), mismo patrón que "expirada" en
-- /contacts (estado derivado para mostrar, no un estado de negocio
-- nuevo). Se limpia solo si el admin reenvía — intento nuevo, borrón y
-- cuenta nueva.
alter table public.contacts add column role_conflict_at timestamptz;

-- issue_contact_invite ya reinicia la ficha al reenviar — que también
-- limpie esta marca, para que un reenvío sea de verdad un intento fresco.
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
          invite_expires_at = null,
          role_conflict_at = null
      where id = p_contact_id;

    insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(), 'contact.linked', 'contact', p_contact_id,
      jsonb_build_object('organization_id', v_organization_id, 'user_id', p_target_user_id, 'contact_role', v_contact_role, 'via', 'resend')
    );

    return query select p_contact_id, true, null::text, null::timestamptz;
    return;
  end if;

  if v_invited_at is not null and v_invited_at > now() - interval '60 seconds' then
    raise exception 'resend_cooldown: wait before resending an invite for contact %', p_contact_id;
  end if;

  v_raw_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '7 days';

  update public.contacts
    set invite_token_hash = digest(v_raw_token, 'sha256'),
        invite_expires_at = v_expires_at,
        invited_at = now(),
        role_conflict_at = null
    where id = p_contact_id;

  return query select p_contact_id, false, v_raw_token, v_expires_at;
end;
$$;

-- resolve_contact_invite: lookup público por token — el token en sí (256
-- bits, gen_random_bytes) es la única credencial necesaria para ver la
-- ficha antes de aceptar. Sin esto, /invite/[token] no podría renderizar
-- nada para alguien que todavía no tiene ninguna sesión de Supabase
-- (recién le llegó el mail). Primera función de este proyecto otorgada a
-- `anon` — no expone nada sin el token exacto, no permite enumerar nada
-- (cero filas si el token no matchea), mismo modelo de confianza que
-- cualquier link de reset de contraseña.
create or replace function public.resolve_contact_invite(p_token text)
returns table (
  contact_id uuid,
  full_name text,
  email text,
  rut text,
  contact_role public.contract_role,
  organization_name text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select c.id, c.full_name, c.email, c.rut, c.contact_role, o.name
  from public.contacts c
  join public.organizations o on o.id = c.organization_id
  where c.invite_token_hash = digest(p_token, 'sha256')
    and c.status = 'pendiente'
    and c.invite_expires_at > now();
$$;

grant execute on function public.resolve_contact_invite(text) to anon, authenticated;

-- confirm_contact_invite: el token ES la credencial, no auth.uid() — se
-- llama desde el servidor vía el service-role client, nunca expuesta al
-- cliente (sin grant a anon/authenticated). Funciona igual haya o no una
-- sesión activa: cubre tanto "la persona recién creó su cuenta en este
-- mismo request" como "la persona ya tenía cuenta y no está logueada acá"
-- — en ambos casos, TypeScript ya resolvió p_target_user_id de antemano
-- (con auth.admin, mismo patrón que en todos lados) y esta función solo
-- re-valida el token y aplica la regla de rol, exactamente como al
-- cargar o reenviar (camino 3 re-chequeado al confirmar, tal como pide
-- la spec).
--
-- Devuelve una fila en vez de lanzar excepción para el caso de rechazo
-- por rol: un `raise exception` deshace TODO lo que la función haya
-- hecho en esa invocación, incluido el UPDATE que marca role_conflict_at
-- — Postgres revierte el bloque entero al propagar la excepción, no solo
-- lo posterior al error. Para que la marca sobreviva aunque el vínculo
-- "falle", el rechazo por rol tiene que ser un resultado normal (ok =
-- false), no una excepción. Token inválido/vencido sí sigue lanzando
-- excepción — ahí no hay ninguna fila de contacts que marcar.
create or replace function public.confirm_contact_invite(p_token text, p_target_user_id uuid)
returns table (ok boolean, contact public.contacts)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_contact public.contacts;
  v_target_role public.contract_role;
begin
  select * into v_contact
  from public.contacts
  where invite_token_hash = digest(p_token, 'sha256')
    and status = 'pendiente'
    and invite_expires_at > now();

  if v_contact.id is null then
    raise exception 'invalid_or_expired_token';
  end if;

  if public.is_platform_admin(p_target_user_id) then
    update public.contacts set role_conflict_at = now() where id = v_contact.id returning * into v_contact;
    return query select false, v_contact;
    return;
  end if;

  v_target_role := public.contact_target_role(p_target_user_id);
  if v_target_role is not null and v_target_role <> v_contact.contact_role then
    update public.contacts set role_conflict_at = now() where id = v_contact.id returning * into v_contact;
    return query select false, v_contact;
    return;
  end if;

  -- Consolida rol_declarado solo si todavía no tiene ninguno (cuenta
  -- recién creada en este mismo flujo) — si ya lo tenía (pasó el chequeo
  -- de arriba, así que es el mismo rol), no hay nada que pisar.
  update public.profiles set rol_declarado = v_contact.contact_role where id = p_target_user_id and rol_declarado is null;

  update public.contacts
    set status = 'confirmado',
        user_id = p_target_user_id,
        confirmed_at = now(),
        invite_token_hash = null,
        invite_expires_at = null,
        role_conflict_at = null
    where id = v_contact.id
    returning * into v_contact;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    p_target_user_id, 'contact.confirmed', 'contact', v_contact.id,
    jsonb_build_object('organization_id', v_contact.organization_id, 'contact_role', v_contact.contact_role)
  );

  return query select true, v_contact;
end;
$$;

grant execute on function public.confirm_contact_invite(text, uuid) to service_role;
