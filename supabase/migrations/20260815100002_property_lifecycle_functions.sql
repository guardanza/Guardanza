-- Rediseño de estados de propiedad, Paso 2: las dos transiciones
-- manuales (activa <-> inactiva), cada una en su propia función
-- security definer con el mismo patrón de pay_guarantee/
-- sign_contract_tenant — lock de fila (for update) + validación +
-- escritura en una sola transacción, para que no quede ventana entre
-- "chequear si tiene un contrato vivo" y "marcar inactiva" donde algo
-- pueda cambiar por debajo.
--
-- "Vivo" = cualquier estado de contrato salvo finalizado/cancelado —
-- mismo criterio que ya usa la UI para "propiedad ocupada"
-- (properties/[id]/page.tsx). Se separa en dos categorías solo para el
-- mensaje, no para la regla en sí:
--   - pendiente_firma_arrendador/arrendatario/pendiente_deposito:
--     contrato en proceso, la garantía todavía no se pagó.
--   - activo/propuesta_termino/en_disputa: la garantía ya está en
--     custodia (pay_guarantee mueve contrato y garantía juntos, en la
--     misma transacción — nunca hay un contrato activo con garantía
--     todavía pendiente, ni uno finalizado con garantía todavía viva).
create or replace function public.set_property_inactive(p_property_id uuid)
returns public.properties
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property public.properties;
  v_blocking_status public.contract_status;
begin
  select * into v_property from public.properties where id = p_property_id for update;
  if not found then
    raise exception 'property % not found', p_property_id;
  end if;

  if not public.is_org_admin(v_property.organization_id, auth.uid()) then
    raise exception 'user % is not authorized to change status of property %', auth.uid(), p_property_id;
  end if;

  select status into v_blocking_status
    from public.contracts
    where property_id = p_property_id
      and status not in ('finalizado', 'cancelado')
    limit 1;

  if v_blocking_status in ('activo', 'propuesta_termino', 'en_disputa') then
    raise exception 'guarantee_in_custody';
  elsif v_blocking_status is not null then
    raise exception 'contract_in_progress';
  end if;

  update public.properties set status = 'inactiva' where id = p_property_id returning * into v_property;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'property.deactivated', 'property', p_property_id, '{}'::jsonb);

  return v_property;
end;
$$;

grant execute on function public.set_property_inactive(uuid) to authenticated;

-- Reactivar: reversible, sin restricción de contrato (si quedó inactiva
-- fue justamente porque no tenía nada vivo, y nada puede crearle un
-- contrato mientras está inactiva — property_candidates_block_if_occupied
-- y el resto del flujo de candidatos siguen funcionando sobre el mismo
-- concepto de "ocupada" de siempre, no sobre este estado nuevo). Solo
-- valida que venga de 'inactiva' — no tiene sentido "reactivar" una
-- propiedad que ya está activa o que sigue en borrador.
create or replace function public.set_property_active(p_property_id uuid)
returns public.properties
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property public.properties;
begin
  select * into v_property from public.properties where id = p_property_id for update;
  if not found then
    raise exception 'property % not found', p_property_id;
  end if;

  if not public.is_org_admin(v_property.organization_id, auth.uid()) then
    raise exception 'user % is not authorized to change status of property %', auth.uid(), p_property_id;
  end if;

  if v_property.status <> 'inactiva' then
    raise exception 'property % is not inactiva (status=%)', p_property_id, v_property.status;
  end if;

  update public.properties set status = 'activa' where id = p_property_id returning * into v_property;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'property.reactivated', 'property', p_property_id, '{}'::jsonb);

  return v_property;
end;
$$;

grant execute on function public.set_property_active(uuid) to authenticated;
