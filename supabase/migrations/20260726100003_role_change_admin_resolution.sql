-- Fase 2: admin-only execution of a role change, plus the panel's approve /
-- reject / direct-change entry points. All three functions check
-- is_platform_admin(auth.uid()) directly (not a client-passed actor id —
-- see the p_actor_user_id audit flagged separately) since this is the most
-- sensitive mutation in the system.
--
-- ejecutar_cambio_rol is the single place the actual structural change
-- happens: moving to arrendatario tears down an admin membership (only
-- when that org has zero properties — never forced by deleting data);
-- moving to arrendador/corredor reuses an existing matching-type org if
-- the user already admins one, otherwise creates one (mirroring
-- signUpWithRole), after first clearing an existing mismatched-type org
-- under the same zero-properties rule. It never deletes contract_parties,
-- contracts, or properties — those stay exactly as they are, which is the
-- whole point: history doesn't depend on current role.

-- profiles_select_self_or_shared never got the admin-bypass clause that
-- organizations/properties got in 20260721220001 — a platform admin
-- couldn't look up an arbitrary user's profile (full_name, rut) unless they
-- shared a contract with them. The admin panel needs exactly that (viewing
-- the requester's/target's profile), so this closes the same gap here.
drop policy if exists profiles_select_self_or_shared on public.profiles;
create policy profiles_select_self_or_shared on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_platform_admin(auth.uid())
    or exists (
      select 1 from public.contract_parties cp1
      join public.contract_parties cp2 on cp2.contract_id = cp1.contract_id
      where cp1.user_id = auth.uid() and cp2.user_id = public.profiles.id
    )
    or public.shares_org_with(auth.uid(), public.profiles.id)
  );

create or replace function public.ejecutar_cambio_rol(
  p_target_user_id uuid,
  p_rol_nuevo public.contract_role,
  p_org_name text default null,
  p_org_rut text default null,
  p_org_legal_form public.legal_form default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_org_id uuid;
  v_current_org_type public.org_type;
  v_target_org_type public.org_type;
  v_new_org_id uuid;
  v_has_properties boolean;
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'user % is not authorized to change roles', auth.uid();
  end if;

  select m.organization_id, o.type into v_current_org_id, v_current_org_type
  from public.memberships m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = p_target_user_id and m.role = 'admin'
  limit 1;

  if p_rol_nuevo = 'arrendatario' then
    if v_current_org_id is not null then
      if v_current_org_type = 'individual' then
        v_has_properties := exists (select 1 from public.properties where organization_id = v_current_org_id);
      else
        v_has_properties := exists (select 1 from public.properties where broker_organization_id = v_current_org_id);
      end if;
      if v_has_properties then
        raise exception 'No se puede bajar a arrendatario: la organización tiene propiedades asociadas.';
      end if;
      delete from public.memberships
        where user_id = p_target_user_id and organization_id = v_current_org_id and role = 'admin';
    end if;
    return;
  end if;

  v_target_org_type := case when p_rol_nuevo = 'corredor' then 'broker' else 'individual' end;

  -- Already administers a matching-type org (e.g. re-approving, or a
  -- lateral request that turns out to be a no-op) — nothing to do.
  if v_current_org_id is not null and v_current_org_type = v_target_org_type then
    return;
  end if;

  if v_current_org_id is not null then
    if v_current_org_type = 'individual' then
      v_has_properties := exists (select 1 from public.properties where organization_id = v_current_org_id);
    else
      v_has_properties := exists (select 1 from public.properties where broker_organization_id = v_current_org_id);
    end if;
    if v_has_properties then
      raise exception 'No se puede cambiar de tipo de participante: la organización tiene propiedades asociadas.';
    end if;
    delete from public.memberships
      where user_id = p_target_user_id and organization_id = v_current_org_id and role = 'admin';
  end if;

  if p_org_name is null or trim(p_org_name) = '' then
    raise exception 'Se requiere un nombre de organización para crear el participante.';
  end if;
  if p_rol_nuevo = 'corredor' and (p_org_rut is null or trim(p_org_rut) = '') then
    raise exception 'Se requiere RUT para una corredora.';
  end if;

  insert into public.organizations (type, name, rut, legal_form, created_by)
    values (
      v_target_org_type,
      p_org_name,
      case when p_rol_nuevo = 'corredor' then p_org_rut else null end,
      coalesce(p_org_legal_form, 'persona_natural'),
      auth.uid()
    )
    returning id into v_new_org_id;

  insert into public.memberships (user_id, organization_id, role)
    values (p_target_user_id, v_new_org_id, 'admin');
end;
$$;

grant execute on function public.ejecutar_cambio_rol(
  uuid, public.contract_role, text, text, public.legal_form
) to authenticated;

create or replace function public.resolver_solicitud_rol(
  p_solicitud_id uuid,
  p_aprobar boolean,
  p_motivo_rechazo text default null,
  p_org_name text default null,
  p_org_rut text default null,
  p_org_legal_form public.legal_form default null
)
returns public.solicitudes_cambio_rol
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitud public.solicitudes_cambio_rol;
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'user % is not authorized to resolve role change requests', auth.uid();
  end if;

  select * into v_solicitud from public.solicitudes_cambio_rol where id = p_solicitud_id for update;
  if not found then
    raise exception 'solicitud % not found', p_solicitud_id;
  end if;
  if v_solicitud.estado <> 'pendiente' then
    raise exception 'solicitud % ya fue resuelta', p_solicitud_id;
  end if;

  if not p_aprobar then
    update public.solicitudes_cambio_rol
      set estado = 'rechazada', resuelto_por = auth.uid(), resuelto_at = now(),
          motivo_rechazo = nullif(trim(p_motivo_rechazo), '')
      where id = p_solicitud_id
      returning * into v_solicitud;

    insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
      values (
        auth.uid(), 'solicitud_cambio_rol.rechazada', 'profile_role_change', v_solicitud.user_id,
        jsonb_build_object(
          'solicitud_id', v_solicitud.id,
          'rol_solicitado', v_solicitud.rol_solicitado,
          'motivo_rechazo', v_solicitud.motivo_rechazo
        )
      );

    return v_solicitud;
  end if;

  perform public.ejecutar_cambio_rol(v_solicitud.user_id, v_solicitud.rol_solicitado, p_org_name, p_org_rut, p_org_legal_form);

  update public.solicitudes_cambio_rol
    set estado = 'aprobada', resuelto_por = auth.uid(), resuelto_at = now()
    where id = p_solicitud_id
    returning * into v_solicitud;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(), 'solicitud_cambio_rol.aprobada', 'profile_role_change', v_solicitud.user_id,
      jsonb_build_object(
        'solicitud_id', v_solicitud.id,
        'rol_anterior_snapshot', v_solicitud.rol_actual_snapshot,
        'rol_nuevo', v_solicitud.rol_solicitado
      )
    );

  return v_solicitud;
end;
$$;

grant execute on function public.resolver_solicitud_rol(
  uuid, boolean, text, text, text, public.legal_form
) to authenticated;

-- Admin changing a user's role directly, with no prior request record —
-- same execution path and same audit trail, distinguishable in metadata
-- by the absence of a solicitud_id.
create or replace function public.cambiar_rol_admin_directo(
  p_target_user_id uuid,
  p_rol_nuevo public.contract_role,
  p_motivo text default null,
  p_org_name text default null,
  p_org_rut text default null,
  p_org_legal_form public.legal_form default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'user % is not authorized to change roles', auth.uid();
  end if;

  perform public.ejecutar_cambio_rol(p_target_user_id, p_rol_nuevo, p_org_name, p_org_rut, p_org_legal_form);

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(), 'profile_role_change.directo', 'profile_role_change', p_target_user_id,
      jsonb_build_object('rol_nuevo', p_rol_nuevo, 'motivo', nullif(trim(p_motivo), ''))
    );
end;
$$;

grant execute on function public.cambiar_rol_admin_directo(
  uuid, public.contract_role, text, text, text, public.legal_form
) to authenticated;

-- Residual-risk visibility: contracts whose property has a delegated
-- broker but which predate the Fase 0 freeze (no corredor row in
-- contract_parties yet), so "who was the corredor" for them still drifts
-- with current membership. security_invoker so this respects the querying
-- user's own RLS (contracts/properties already bypass for platform admins)
-- instead of running as the view owner, which would otherwise leak every
-- row to any authenticated grantee.
create or replace view public.contratos_corredor_sin_congelar
with (security_invoker = true)
as
select c.id as contract_id, c.status, c.created_at, p.id as property_id, p.address, p.broker_organization_id
from public.contracts c
join public.properties p on p.id = c.property_id
where p.broker_organization_id is not null
  and not exists (
    select 1 from public.contract_parties cp
    where cp.contract_id = c.id and cp.role = 'corredor'
  );

grant select on public.contratos_corredor_sin_congelar to authenticated;
