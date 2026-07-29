-- Paso 2 del refactor de rol persistente.
--
-- 1) ejecutar_cambio_rol ahora escribe profiles.rol_declarado de verdad.
--    Antes, la rama 'arrendatario' terminaba en un `return;` sin tocar
--    nada estructural (arrendatario no usa organización) — por eso el
--    cambio directo del admin a arrendatario era un no-op total para
--    cualquier usuario sin organización previa (el bug reportado).
--    Arrendador/corredor ya creaban organización + membership, que es lo
--    que getProfileTypeLabel mira hoy; ahora ADEMÁS consolidan
--    rol_declarado, para que quede al día incluso en el caso legado de
--    alguien que ya administraba la org correcta pero nunca tuvo este
--    campo escrito.
--
-- 2) La función pasa de `returns void` a `returns boolean`: true si hizo
--    un cambio real, false si era un no-op (ya estaba exactamente en el
--    rol pedido, sin nada que crear/destruir). Los dos wrappers
--    (cambiar_rol_admin_directo, resolver_solicitud_rol) usan ese booleano
--    para marcar la entrada de audit_log como 'sin_cambios' en vez de
--    mentir sobre que algo pasó — nunca dejan de escribir la entrada
--    (se quiere el rastro de la intención del admin igual), solo la
--    marcan con precisión.
--
-- Cada `raise exception` y cada condición de la función original
-- (20260726100003) se preserva exactamente igual, en el mismo orden —
-- solo se agrega la lectura/escritura de rol_declarado y los retornos
-- booleanos. Ninguna regla de negocio existente cambia.
drop function if exists public.ejecutar_cambio_rol(
  uuid, public.contract_role, text, text, public.legal_form
);

create function public.ejecutar_cambio_rol(
  p_target_user_id uuid,
  p_rol_nuevo public.contract_role,
  p_org_name text default null,
  p_org_rut text default null,
  p_org_legal_form public.legal_form default null
)
returns boolean
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
  v_rol_declarado_actual public.contract_role;
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'user % is not authorized to change roles', auth.uid();
  end if;

  select m.organization_id, o.type into v_current_org_id, v_current_org_type
  from public.memberships m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = p_target_user_id and m.role = 'admin'
  limit 1;

  select rol_declarado into v_rol_declarado_actual from public.profiles where id = p_target_user_id;

  if p_rol_nuevo = 'arrendatario' then
    -- No-op real: ya es arrendatario declarado y no administra ninguna
    -- organización (si administrara una, tearing it down abajo SÍ es un
    -- cambio real, aunque rol_declarado ya dijera 'arrendatario').
    if v_current_org_id is null and v_rol_declarado_actual = 'arrendatario' then
      return false;
    end if;

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

    update public.profiles set rol_declarado = 'arrendatario' where id = p_target_user_id;
    return true;
  end if;

  v_target_org_type := case when p_rol_nuevo = 'corredor' then 'broker' else 'individual' end;

  -- Ya administra una org del tipo correcto: nada estructural que hacer,
  -- pero consolidamos rol_declarado si venía desactualizado (dato legado
  -- de antes de este campo existir).
  if v_current_org_id is not null and v_current_org_type = v_target_org_type then
    if v_rol_declarado_actual = p_rol_nuevo then
      return false;
    end if;
    update public.profiles set rol_declarado = p_rol_nuevo where id = p_target_user_id;
    return true;
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

  update public.profiles set rol_declarado = p_rol_nuevo where id = p_target_user_id;

  return true;
end;
$$;

-- Sin grant execute a authenticated aquí, a propósito: la versión anterior
-- SÍ lo tenía, pero nada del cliente la llama directo (grepeado en
-- src/ — cero call sites) y hacerlo bypasea por completo el audit_log
-- (el insert vive en los dos wrappers de abajo, no acá). Un admin real
-- podía antes ejecutar un cambio de rol legítimo sin dejar ningún rastro.
-- Ahora solo cambiar_rol_admin_directo y resolver_solicitud_rol pueden
-- ejecutar el cambio real, y ambos auditan siempre.
--
-- CREATE FUNCTION otorga EXECUTE a PUBLIC por defecto salvo que se
-- revoque explícitamente (a diferencia de las tablas, que no tienen
-- acceso público implícito) — verificado empíricamente que sin este
-- revoke, un cliente autenticado seguía pudiendo invocarla directo pese a
-- no tener ningún grant explícito a su nombre.
revoke execute on function public.ejecutar_cambio_rol(
  uuid, public.contract_role, text, text, public.legal_form
) from public;

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
declare
  v_cambio_real boolean;
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'user % is not authorized to change roles', auth.uid();
  end if;

  v_cambio_real := public.ejecutar_cambio_rol(p_target_user_id, p_rol_nuevo, p_org_name, p_org_rut, p_org_legal_form);

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(), 'profile_role_change.directo', 'profile_role_change', p_target_user_id,
      jsonb_build_object(
        'rol_nuevo', p_rol_nuevo,
        'motivo', nullif(trim(p_motivo), ''),
        'sin_cambios', not v_cambio_real
      )
    );
end;
$$;

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
  v_cambio_real boolean;
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

  v_cambio_real := public.ejecutar_cambio_rol(v_solicitud.user_id, v_solicitud.rol_solicitado, p_org_name, p_org_rut, p_org_legal_form);

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
        'rol_nuevo', v_solicitud.rol_solicitado,
        'sin_cambios', not v_cambio_real
      )
    );

  return v_solicitud;
end;
$$;
