-- Tanda B, Paso 3: vinculación por email — los tres caminos (nuevo,
-- mismo rol, otro rol) detrás de una única función security definer.
--
-- Por qué una función y no un insert directo desde el cliente: resolver
-- "¿esta cuenta ya existe, y con qué rol?" para un tercero con el que el
-- llamador todavía no comparte nada (ni org, ni contrato) requiere
-- bypassear profiles_select_self_or_shared — el mismo tipo de necesidad
-- que ya resolvió lookup_organization_by_code para códigos de corredora.
--
-- La resolución del email en sí (¿existe una cuenta con este email?)
-- sigue haciéndose en TypeScript vía el admin client
-- (auth.admin.listUsers()), como en el resto del código — ninguna función
-- SQL de este proyecto toca auth.users directamente, y esta no rompe esa
-- convención. El resultado (user_id o null) se pasa como parámetro ya
-- resuelto.
--
-- Separación importante respetada acá: esta función solo gestiona la
-- LIBRETA (contacts). No toca contract_parties, no otorga ningún permiso
-- de firma ni de gestión de contratos — quedar "confirmado" como contacto
-- (camino 2, vínculo directo porque la persona ya validó su identidad al
-- registrarse) no es lo mismo que prestar consentimiento para un
-- contrato. Meter a alguien en un contrato sigue exigiendo su propia
-- firma a través del flujo de firma existente (fn_sign_contract), que
-- nadie aquí toca ni bypassea.
alter table public.contacts add column confirmed_at timestamptz;

-- Solo para uso interno de load_contact (y, en el Paso 5, de la función
-- de confirmación que reaplica esta misma regla) — deliberadamente SIN
-- grant a authenticated/anon más abajo: sería un oráculo de "qué rol
-- tiene la cuenta X" para cualquier UUID, más sensible que el patrón ya
-- tolerado de is_org_member/is_org_admin (que devuelven un booleano de
-- membresía, no un rol). Mismo orden de prioridad que getProfileTypeLabel
-- (src/lib/profile-label.ts), colapsado a los 3 valores de contract_role
-- — null significa "sin rol todavía", no "sin cuenta".
create or replace function public.contact_target_role(p_user_id uuid)
returns public.contract_role
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.memberships m
      join public.organizations o on o.id = m.organization_id
      where m.user_id = p_user_id and m.role = 'admin' and o.type = 'broker'
    ) then 'corredor'::public.contract_role
    when exists (
      select 1 from public.memberships m
      join public.organizations o on o.id = m.organization_id
      where m.user_id = p_user_id and m.role = 'admin' and o.type = 'individual'
    ) then 'arrendador'::public.contract_role
    when (select p.rol_declarado from public.profiles p where p.id = p_user_id) = 'arrendatario'
      then 'arrendatario'::public.contract_role
    when exists (
      select 1 from public.contract_parties cp where cp.user_id = p_user_id and cp.role = 'arrendatario'
    ) then 'arrendatario'::public.contract_role
    else null
  end;
$$;

revoke execute on function public.contact_target_role(uuid) from public, anon, authenticated;

-- load_contact: único punto de entrada para cargar una ficha, para
-- cualquiera de los tres caminos. p_target_user_id ya viene resuelto
-- desde TypeScript (null si el email no tiene cuenta todavía). Bypassea
-- contacts_insert (RLS) a propósito — repite el mismo chequeo de
-- autorización adentro, igual que set_kyc_status.
create or replace function public.load_contact(
  p_organization_id uuid,
  p_contact_role public.contract_role,
  p_full_name text,
  p_email text,
  p_rut text,
  p_target_user_id uuid
)
returns public.contacts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_role public.contract_role;
  v_contact public.contacts;
begin
  if not public.is_org_admin(p_organization_id, auth.uid()) then
    raise exception 'user % is not authorized to load contacts into organization %', auth.uid(), p_organization_id;
  end if;

  if p_target_user_id is not null then
    -- Camino 3 (parte 1): una cuenta de plataforma no es un rol de
    -- mercado — nunca es cargable como contacto, sea cual sea el
    -- contact_role pedido.
    if public.is_platform_admin(p_target_user_id) then
      raise exception 'contact_role_mismatch: target account is a platform admin, not a marketplace role';
    end if;

    v_target_role := public.contact_target_role(p_target_user_id);
    -- v_target_role null = la cuenta existe pero todavía no tiene ningún
    -- rol asentado (ej. arrendatario recién registrado sin declarar nada
    -- aún) — nada con qué chocar todavía, se trata como camino 2.
    if v_target_role is not null and v_target_role <> p_contact_role then
      raise exception 'contact_role_mismatch: target account already has role %, cannot load as %', v_target_role, p_contact_role;
    end if;
  end if;

  insert into public.contacts (
    organization_id, contact_role, full_name, email, rut, created_by,
    user_id, status, confirmed_at
  ) values (
    p_organization_id, p_contact_role, p_full_name, p_email, p_rut, auth.uid(),
    p_target_user_id,
    case when p_target_user_id is not null then 'confirmado' else 'pendiente' end::public.contact_status,
    case when p_target_user_id is not null then now() else null end
  )
  returning * into v_contact;

  -- Camino 2 (vínculo directo): deja constancia auditable de inmediato.
  -- La notificación real a la persona vinculada (email/in-app) todavía no
  -- tiene ningún mecanismo de envío en este proyecto — ni siquiera
  -- Notificaciones (src/app/notifications) envía nada real hoy ("por
  -- ahora esto guarda tu preferencia"). El adapter de email del Paso 4 es
  -- lo que va a leer/disparar este aviso; este registro es la fuente de
  -- verdad de que el aviso se debe mandar.
  if p_target_user_id is not null then
    insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(), 'contact.linked', 'contact', v_contact.id,
      jsonb_build_object('organization_id', p_organization_id, 'user_id', p_target_user_id, 'contact_role', p_contact_role)
    );
  end if;

  return v_contact;
end;
$$;

grant execute on function public.load_contact(
  uuid, public.contract_role, text, text, text, uuid
) to authenticated;
