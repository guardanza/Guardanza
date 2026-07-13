-- Supersession bookkeeping: creating a counter-proposal automatically marks
-- the proposal it supersedes as 'superada'. This is the only automatic
-- status mutation on proposals that happens outside accept_proposal() below
-- — it's a direct, mechanical consequence of the INSERT itself.

create or replace function public.proposals_mark_superseded()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.supersedes_proposal_id is not null then
    update public.proposals
      set status = 'superada'
      where id = new.supersedes_proposal_id
        and status = 'pendiente';
  end if;
  return new;
end;
$$;

create trigger proposals_mark_superseded
  after insert on public.proposals
  for each row execute function public.proposals_mark_superseded();

-- accept_proposal: the only way a dispute proposal is accepted. Generates
-- the liquidation ledger entries (amount awarded out of the guarantee, plus
-- whatever remainder is returned to the tenant), closes the dispute,
-- settles the guarantee, and — per the state machine agreed for Fase A —
-- finalizes the contract. There is no intermediate state where the
-- guarantee is liquidated but the contract is still "active"; tenancy ends
-- exactly when the guarantee is settled. All of it happens in one
-- transaction with its audit_log row.
--
-- Currency note: proposals.total_amount / proposal_items.amount are always
-- CLP — repair quotes are never priced in UF fractions in practice. When
-- the guarantee itself is denominated in UF, comparing/liquidating against
-- it requires converting through the SAME frozen uf_rate_at_signing used
-- everywhere else (contract_guarantee_amounts) — never today's UF. Ledger
-- entries stay denominated in the guarantee's own currency, since that's
-- literally what the custodian holds.

create or replace function public.accept_proposal(p_proposal_id uuid, p_actor_user_id uuid)
returns public.disputes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.proposals;
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
  select * into v_proposal from public.proposals where id = p_proposal_id for update;
  if not found then
    raise exception 'proposal % not found', p_proposal_id;
  end if;

  if v_proposal.status <> 'pendiente' then
    raise exception 'proposal % is not pendiente (status=%)', p_proposal_id, v_proposal.status;
  end if;

  if v_proposal.created_by = p_actor_user_id then
    raise exception 'user % cannot accept their own proposal', p_actor_user_id;
  end if;

  select * into v_dispute from public.disputes where id = v_proposal.dispute_id for update;
  select * into v_guarantee from public.guarantees where id = v_dispute.guarantee_id for update;
  select * into v_contract from public.contracts where id = v_guarantee.contract_id for update;

  if not public.has_contract_access(
    v_contract.id, p_actor_user_id, array['arrendador', 'arrendatario']::public.contract_role[]
  ) then
    raise exception 'user % is not authorized to accept proposal %', p_actor_user_id, p_proposal_id;
  end if;

  v_guarantee_amount_clp := case
    when v_guarantee.currency = 'UF' then v_guarantee.amount * v_contract.uf_rate_at_signing
    else v_guarantee.amount
  end;

  if v_proposal.total_amount > v_guarantee_amount_clp then
    raise exception 'proposal total_amount (% CLP) exceeds guarantee amount (% CLP)',
      v_proposal.total_amount, v_guarantee_amount_clp;
  end if;

  v_remainder_clp := v_guarantee_amount_clp - v_proposal.total_amount;

  if v_guarantee.currency = 'UF' then
    v_liquidacion_amount := round(v_proposal.total_amount / v_contract.uf_rate_at_signing, 4);
    v_devolucion_amount := round(v_remainder_clp / v_contract.uf_rate_at_signing, 4);
  else
    v_liquidacion_amount := v_proposal.total_amount;
    v_devolucion_amount := v_remainder_clp;
  end if;

  update public.proposals set status = 'aceptada' where id = p_proposal_id;

  update public.disputes
    set status = 'liquidada', closed_at = now()
    where id = v_dispute.id
    returning * into v_dispute;

  update public.guarantees set status = 'liquidada' where id = v_guarantee.id;

  update public.contracts set status = 'finalizado' where id = v_contract.id;

  -- ledger_entries.amount is check (amount > 0) — a proposal can legitimately
  -- award 0 (full refund to tenant), which simply means no liquidacion entry.
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
      p_actor_user_id, 'proposal.accepted', 'proposal', p_proposal_id,
      jsonb_build_object(
        'dispute_id', v_dispute.id,
        'contract_id', v_contract.id,
        'ledger_liquidacion_id', v_ledger_liquidacion_id,
        'ledger_devolucion_id', v_ledger_devolucion_id,
        'total_amount_clp', v_proposal.total_amount,
        'remainder_clp', v_remainder_clp
      )
    );

  return v_dispute;
end;
$$;

grant execute on function public.accept_proposal(uuid, uuid) to authenticated;
