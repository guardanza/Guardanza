-- Tanda D Fase 1, paso 6 (SENSIBLE): deshacer una adjudicación.
--
-- Dos caminos llegan a la misma necesidad — "este contrato no debería
-- haber pasado, hay que soltar al candidato de nuevo":
--
--   1. cancel_contract() ya existía (marca el contrato 'cancelado'), pero
--      nunca tocaba property_candidates: el candidato quedaba pegado en
--      'seleccionado' (o 'no_seleccionado' el resto) aunque la propiedad
--      ya volvía a aceptar candidatos según isOccupied. Bug reportado:
--      el chip de rol arriba se actualizaba bien (mira el contrato
--      activo), pero "Candidatos para arrendar" abajo quedaba
--      desincronizado.
--   2. undo_winning_candidate() es nueva: deshace la adjudicación por
--      completo (borra el contrato) — solo cuando nadie firmó todavía,
--      como si el contrato nunca se hubiera creado.
--
-- revert_candidate_selection() es la lógica compartida entre ambas.
--
-- Cómo encuentra "a quién descartó ESTA adjudicación en particular", sin
-- agregar ninguna columna nueva: select_winning_candidate() marca al
-- ganador ('seleccionado') y a los perdedores de la misma propiedad
-- ('no_seleccionado') en la MISMA transacción — y en Postgres, now() es
-- constante durante toda una transacción (no cambia entre statements).
-- Los tres updated_at quedan exactamente iguales. Comparar por ese valor
-- exacto separa "a quién tumbó esta adjudicación" de un candidato que el
-- corredor ya había descartado a mano antes, sin tocarlo.
create or replace function public.revert_candidate_selection(p_contract_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_id uuid;
  v_tenant_user_id uuid;
  v_candidate public.property_candidates;
begin
  select property_id into v_property_id from public.contracts where id = p_contract_id;
  if v_property_id is null then
    return;
  end if;

  select user_id into v_tenant_user_id
  from public.contract_parties
  where contract_id = p_contract_id and role = 'arrendatario';
  if v_tenant_user_id is null then
    return;
  end if;

  select pc.* into v_candidate
  from public.property_candidates pc
  join public.contacts c on c.id = pc.contact_id
  where pc.property_id = v_property_id and pc.status = 'seleccionado' and c.user_id = v_tenant_user_id
  limit 1;

  -- Este contrato no vino de una adjudicación (create_contract(), el
  -- camino viejo con email libre) -- nada que revertir, no es un error.
  if v_candidate.id is null then
    return;
  end if;

  update public.property_candidates
    set status = 'en_evaluacion'
    where property_id = v_property_id and status = 'no_seleccionado' and updated_at = v_candidate.updated_at;

  update public.property_candidates set status = 'en_evaluacion' where id = v_candidate.id;
end;
$$;

-- Sin grant a authenticated/anon a propósito -- solo la llaman otras
-- funciones security definer (cancel_contract, undo_winning_candidate),
-- que corren como el dueño de la función y por eso no necesitan un
-- grant explícito. Exponerla directo sería dejar que cualquiera revierta
-- el estado de candidatos de un contrato ajeno sin pasar por ninguna
-- autorización -- esta función, a propósito, no valida ninguna.
revoke execute on function public.revert_candidate_selection(uuid) from public, anon, authenticated;

-- cancel_contract: mismo comportamiento de siempre (autorización, estados
-- desde los que se puede cancelar, sin cambios), solo suma la reversión
-- de candidatos antes de marcar 'cancelado'.
create or replace function public.cancel_contract(p_contract_id uuid)
returns public.contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.contracts;
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'contract % not found', p_contract_id;
  end if;

  if not public.has_contract_access(
    p_contract_id, auth.uid(), array['arrendador', 'arrendatario']::public.contract_role[]
  ) then
    raise exception 'user % is not authorized to cancel contract %', auth.uid(), p_contract_id;
  end if;

  if v_contract.status not in ('pendiente_firma_arrendador', 'pendiente_firma_arrendatario', 'pendiente_deposito') then
    raise exception 'contract % cannot be cancelled from status %', p_contract_id, v_contract.status;
  end if;

  update public.contracts set status = 'cancelado' where id = p_contract_id returning * into v_contract;

  perform public.revert_candidate_selection(p_contract_id);

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'contract.cancelled', 'contract', p_contract_id, '{}'::jsonb);

  return v_contract;
end;
$$;

-- undo_winning_candidate: deshacer la adjudicación por completo, como si
-- nunca hubiera pasado -- solo mientras nadie firmó (mismo criterio que
-- ya usa la vista contracts_branch_status para 'esperando_firmas': ambas
-- columnas de firma en null). Misma autorización que
-- select_winning_candidate: admin de la organización dueña o de la
-- corredora delegada.
create or replace function public.undo_winning_candidate(p_contract_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.contracts;
  v_property public.properties;
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'contract % not found', p_contract_id;
  end if;

  select * into v_property from public.properties where id = v_contract.property_id for update;

  if not (
    public.is_org_admin(v_property.organization_id, auth.uid())
    or public.is_org_admin(v_property.broker_organization_id, auth.uid())
  ) then
    raise exception 'user % is not authorized to undo contract %', auth.uid(), p_contract_id;
  end if;

  if v_contract.signed_at_landlord is not null or v_contract.signed_at_tenant is not null then
    raise exception 'contract % already has a signature, cannot undo', p_contract_id;
  end if;

  -- Igual que cancel_contract: hay que sacar al contrato de la cuenta de
  -- "propiedad ocupada" ANTES de poder revertir los candidatos --
  -- property_candidates_block_if_occupied no deja volver a en_evaluacion
  -- a nadie mientras exista un contrato activo para la propiedad.
  -- Marcarlo 'cancelado' primero (el mismo estado que deja cancel_contract)
  -- destraba esa condición sin necesitar borrar el contrato todavía --
  -- revert_candidate_selection igual necesita que la fila exista para
  -- resolver property_id y el arrendatario vía contract_parties.
  update public.contracts set status = 'cancelado' where id = p_contract_id;

  perform public.revert_candidate_selection(p_contract_id);

  -- La garantía se crea sola al insertar el contrato
  -- (contracts_create_guarantee, trigger after insert) -- acá todavía no
  -- se pagó nada (estado_garantia sigue 'pendiente' porque nadie firmó
  -- -- pagar exige haber firmado antes), así que borrarla es seguro.
  -- contract_parties/documents/signature_envelopes son ON DELETE CASCADE.
  delete from public.guarantees where contract_id = p_contract_id;
  delete from public.contracts where id = p_contract_id;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'contract.undone', 'contract', p_contract_id, jsonb_build_object('property_id', v_property.id));
end;
$$;

grant execute on function public.undo_winning_candidate(uuid) to authenticated;
