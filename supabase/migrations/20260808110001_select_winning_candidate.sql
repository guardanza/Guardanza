-- Tanda D Fase 1, paso 5 (SENSIBLE): la conversión candidato→arrendatario
-- + creación del contrato. Cierra el hueco documentado en el
-- diagnóstico: hoy create_contract() solo autoriza al admin de la
-- organización dueña (is_org_admin(property.organization_id, ...)) —
-- pero el spec pide que sea el CORREDOR quien elija al ganador.
--
-- Decisión deliberada: esta función es NUEVA y separada de
-- create_contract(), no una ampliación de su autorización. create_contract()
-- sigue siendo estrictamente del arrendador — el camino viejo de
-- /contracts/new con email libre (sin ninguna evaluación detrás) no gana
-- ningún poder nuevo. select_winning_candidate() sí autoriza también al
-- corredor, pero acotado a un caso mucho más angosto: solo puede
-- convertir un candidato que YA pasó por evaluación (en_evaluacion) y
-- que YA confirmó su cuenta (contacts.status = 'confirmado', con
-- user_id) — nunca un email cualquiera tipeado a mano. Esa es la
-- garantía que separa "el corredor puede generar cualquier obligación
-- contractual" (peligroso, sin acotar) de "el corredor puede cerrar el
-- proceso de selección que ya armó y evaluó" (lo que de verdad pide el
-- producto).
--
-- El arrendador del contrato es SIEMPRE el admin de la organización
-- dueña de la propiedad — nunca quien llama la función. Si llama el
-- corredor, igual es el dueño quien queda como parte 'arrendador' y
-- quien firma esa mitad (sign_contract_landlord ya exige ser ese admin,
-- sin cambios acá).
--
-- Bloqueo de carrera: dos candidatos de la MISMA propiedad podrían
-- "ganar" en paralelo si dos llamadas concurrentes leyeran el estado
-- viejo antes de que la primera terminara. Se cierra bloqueando la fila
-- de properties (for update) ANTES de leer el estado del candidato — la
-- segunda llamada queda esperando a que la primera termine, y cuando
-- sigue, relee el candidato ya actualizado (no en_evaluacion) y falla
-- limpio.
create or replace function public.select_winning_candidate(
  p_candidate_id uuid,
  p_start_date date,
  p_end_date date,
  p_rent_amount numeric,
  p_rent_currency public.currency_code,
  p_guarantee_currency public.currency_code,
  p_guarantee_amount numeric
)
returns public.contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_id uuid;
  v_property public.properties;
  v_candidate public.property_candidates;
  v_contact public.contacts;
  v_landlord_user_id uuid;
  v_contract public.contracts;
begin
  select property_id into v_property_id from public.property_candidates where id = p_candidate_id;
  if v_property_id is null then
    raise exception 'candidate % not found', p_candidate_id;
  end if;

  select * into v_property from public.properties where id = v_property_id for update;

  if not (
    public.is_org_admin(v_property.organization_id, auth.uid())
    or public.is_org_admin(v_property.broker_organization_id, auth.uid())
  ) then
    raise exception 'user % is not authorized to select a winning candidate for property %', auth.uid(), v_property.id;
  end if;

  -- Relectura del candidato DESPUÉS de tomar el lock de properties — ver
  -- comentario de arriba sobre la carrera entre dos elecciones
  -- concurrentes para la misma propiedad.
  select * into v_candidate from public.property_candidates where id = p_candidate_id for update;
  if v_candidate.status <> 'en_evaluacion' then
    raise exception 'candidate % is not en_evaluacion (status=%)', p_candidate_id, v_candidate.status;
  end if;

  select * into v_contact from public.contacts where id = v_candidate.contact_id;
  if v_contact.status <> 'confirmado' or v_contact.user_id is null then
    raise exception 'candidate % has not confirmed their account yet', p_candidate_id;
  end if;

  select m.user_id into v_landlord_user_id
  from public.memberships m
  where m.organization_id = v_property.organization_id and m.role = 'admin'
  order by m.created_at asc
  limit 1;

  if v_landlord_user_id is null then
    raise exception 'property % has no admin on its owning organization', v_property.id;
  end if;

  insert into public.contracts (property_id, start_date, end_date, rent_amount, rent_currency, guarantee_currency, guarantee_amount)
  values (v_property.id, p_start_date, p_end_date, p_rent_amount, p_rent_currency, p_guarantee_currency, p_guarantee_amount)
  returning * into v_contract;

  insert into public.contract_parties (contract_id, user_id, role) values (v_contract.id, v_landlord_user_id, 'arrendador');
  insert into public.contract_parties (contract_id, user_id, role) values (v_contract.id, v_contact.user_id, 'arrendatario');

  -- Mismo snapshot de staff de la corredora que create_contract().
  insert into public.contract_parties (contract_id, user_id, role)
    select v_contract.id, m.user_id, 'corredor'
    from public.memberships m
    where m.organization_id = v_property.broker_organization_id
    on conflict (contract_id, user_id) do nothing;

  update public.property_candidates set status = 'seleccionado' where id = p_candidate_id;

  update public.property_candidates
    set status = 'no_seleccionado'
    where property_id = v_property.id and status = 'en_evaluacion' and id <> p_candidate_id;

  return v_contract;
end;
$$;

grant execute on function public.select_winning_candidate(
  uuid, date, date, numeric, public.currency_code, public.currency_code, numeric
) to authenticated;
