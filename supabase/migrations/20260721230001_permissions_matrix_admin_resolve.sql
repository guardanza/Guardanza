-- Bloque E: closes two remaining gaps against the doc's matriz de
-- permisos (section 6). Deliberately narrow — most of the matrix already
-- matched (firmar/proponer/ver contrato ajeno for admin were handled in
-- earlier bloques), and rows with no corresponding feature yet at all
-- (suspender empresa, datos bancarios) are left out rather than bolting
-- on speculative scaffolding.

-- "Proponer descuentos" is arrendador-only in the doc — opening a dispute
-- against your own deposit as the tenant doesn't match the flujo's logic
-- anyway (flujo 2 is entirely landlord-initiated). Tenants keep their
-- (arguably more important) tool: rejecting a proposal with a reason.
drop policy if exists disputes_insert_party on public.disputes;
create policy disputes_insert_party on public.disputes
  for insert to authenticated
  with check (
    opened_by = auth.uid()
    and exists (
      select 1 from public.guarantees g
      where g.id = disputes.guarantee_id
        and public.has_contract_access(g.contract_id, auth.uid(), array['arrendador']::public.contract_role[])
    )
  );

-- "Resolver disputa" is admin-only in the doc. This is additive, not a
-- replacement for accept_proposal — parties can still self-settle by
-- mutual agreement even after escalation (real negotiations often do),
-- this just gives ADMIN_SISTEMA a direct arbitration path for when they
-- don't. Same settlement math as accept_proposal (liquidación + devolución
-- ledger entries, guarantee/contract closed together).
create or replace function public.resolve_dispute_admin(
  p_dispute_id uuid,
  p_actor_user_id uuid,
  p_monto_retenido numeric,
  p_notas text default null
)
returns public.disputes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dispute public.disputes;
  v_guarantee public.guarantees;
  v_contract public.contracts;
  v_guarantee_amount_clp numeric;
  v_remainder_clp numeric;
  v_liquidacion_amount numeric;
  v_devolucion_amount numeric;
  v_ledger_liquidacion_id uuid;
  v_ledger_devolucion_id uuid;
begin
  if not public.is_platform_admin(p_actor_user_id) then
    raise exception 'user % is not authorized to resolve disputes', p_actor_user_id;
  end if;

  select * into v_dispute from public.disputes where id = p_dispute_id for update;
  if not found then
    raise exception 'dispute % not found', p_dispute_id;
  end if;

  if v_dispute.status <> 'escalada' then
    raise exception 'dispute % is not escalada (status=%)', p_dispute_id, v_dispute.status;
  end if;

  select * into v_guarantee from public.guarantees where id = v_dispute.guarantee_id for update;
  select * into v_contract from public.contracts where id = v_guarantee.contract_id for update;

  v_guarantee_amount_clp := case
    when v_guarantee.currency = 'UF' then v_guarantee.amount * v_contract.uf_rate_at_signing
    else v_guarantee.amount
  end;

  if p_monto_retenido < 0 or p_monto_retenido > v_guarantee_amount_clp then
    raise exception 'monto_retenido (% CLP) must be between 0 and the guarantee amount (% CLP)',
      p_monto_retenido, v_guarantee_amount_clp;
  end if;

  v_remainder_clp := v_guarantee_amount_clp - p_monto_retenido;

  if v_guarantee.currency = 'UF' then
    v_liquidacion_amount := round(p_monto_retenido / v_contract.uf_rate_at_signing, 4);
    v_devolucion_amount := round(v_remainder_clp / v_contract.uf_rate_at_signing, 4);
  else
    v_liquidacion_amount := p_monto_retenido;
    v_devolucion_amount := v_remainder_clp;
  end if;

  update public.disputes set status = 'liquidada', closed_at = now() where id = p_dispute_id returning * into v_dispute;
  update public.guarantees set status = 'liquidada' where id = v_guarantee.id;
  update public.contracts set status = 'finalizado' where id = v_contract.id;

  if v_liquidacion_amount > 0 then
    insert into public.ledger_entries (guarantee_id, entry_type, amount, currency, direction, related_dispute_id)
      values (v_guarantee.id, 'garantia_liquidada', v_liquidacion_amount, v_guarantee.currency, 'haber', v_dispute.id)
      returning id into v_ledger_liquidacion_id;
  end if;

  if v_devolucion_amount > 0 then
    insert into public.ledger_entries (guarantee_id, entry_type, amount, currency, direction, related_dispute_id)
      values (v_guarantee.id, 'garantia_devuelta', v_devolucion_amount, v_guarantee.currency, 'haber', v_dispute.id)
      returning id into v_ledger_devolucion_id;
  end if;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      p_actor_user_id, 'dispute.resolved_by_admin', 'dispute', p_dispute_id,
      jsonb_build_object(
        'contract_id', v_contract.id,
        'monto_retenido_clp', p_monto_retenido,
        'remainder_clp', v_remainder_clp,
        'ledger_liquidacion_id', v_ledger_liquidacion_id,
        'ledger_devolucion_id', v_ledger_devolucion_id,
        'notas', p_notas
      )
    );

  return v_dispute;
end;
$$;

grant execute on function public.resolve_dispute_admin(uuid, uuid, numeric, text) to authenticated;
