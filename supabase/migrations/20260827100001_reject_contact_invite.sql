-- Rechazar una invitación de contacto — mismo cuidado que
-- confirm_contact_invite (el token ES la credencial), pero mucho más
-- simple: no crea cuenta, no vincula nada, solo anota que la persona dijo
-- que no. La ficha NO se borra ni se saca de la libreta del corredor —
-- sigue 'pendiente' (mismo patrón ya usado por role_conflict_at: una
-- anotación sobre una ficha pendiente, no un tercer valor del enum
-- contact_status), con esta columna nueva marcando el rechazo.
alter table public.contacts add column invite_rejected_at timestamptz;

-- issue_contact_invite ya limpia role_conflict_at en sus dos caminos (se
-- vincula directo, o se reemite un token) — que también limpie el
-- rechazo, para que un reenvío sea de verdad un intento fresco: si el
-- corredor reenvía después de un rechazo, la persona vuelve a quedar
-- simplemente "invitación pendiente", no "rechazada Y pendiente" a la
-- vez.
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
          role_conflict_at = null,
          invite_rejected_at = null
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
        role_conflict_at = null,
        invite_rejected_at = null
    where id = p_contact_id;

  return query select p_contact_id, false, v_raw_token, v_expires_at;
end;
$$;

-- reject_contact_invite: público por token, igual que resolve_contact_invite
-- (mismo modelo de confianza: el token de 256 bits es toda la prueba de
-- identidad que hace falta — no hay sesión que chequear, la persona puede
-- no tener ninguna cuenta todavía). A diferencia de confirm_contact_invite,
-- no recibe p_target_user_id: rechazar no crea ni vincula ninguna cuenta,
-- así que no hace falta resolver nada de auth.users antes de llamarla —
-- se puede invocar directo con el cliente normal (anon key), mismo patrón
-- que ya usa /invite/[token] para resolve_contact_invite.
--
-- Invalida el token al rechazar (invite_token_hash/invite_expires_at en
-- null) para que no se pueda reusar después — ni para aceptar ni para
-- rechazar de nuevo. `ok = false` (sin lanzar excepción) cuando el token
-- ya no es válido, mismo motivo que confirm_contact_invite: un doble
-- submit o un link viejo no debería verse como un error de servidor.
create or replace function public.reject_contact_invite(p_token text)
returns table (ok boolean)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_contact_id uuid;
begin
  select id into v_contact_id
  from public.contacts
  where invite_token_hash = digest(p_token, 'sha256')
    and status = 'pendiente'
    and invite_expires_at > now();

  if v_contact_id is null then
    return query select false;
    return;
  end if;

  update public.contacts
    set invite_rejected_at = now(),
        invite_token_hash = null,
        invite_expires_at = null
    where id = v_contact_id;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
  values (null, 'contact.invite_rejected', 'contact', v_contact_id, '{}'::jsonb);

  return query select true;
end;
$$;

grant execute on function public.reject_contact_invite(text) to anon, authenticated;
