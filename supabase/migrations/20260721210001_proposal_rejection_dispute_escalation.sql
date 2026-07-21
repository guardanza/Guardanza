-- Bloque C: aligns Propuestas de arreglo with the doc's flujo 2/3 — a
-- landlord's proposal is lightweight (contract moves to
-- 'propuesta_termino', no formal dispute yet); it only escalates into a
-- real 'en_disputa' if the tenant explicitly REJECTS it with a reason,
-- as opposed to negotiating via a counter-proposal (which stays in
-- 'propuesta_termino').

alter type public.contract_status add value 'propuesta_termino' after 'activo';

alter table public.disputes add column motivo_rechazo text;

-- Opening a dispute (i.e. proposing termination terms) is only meaningful
-- against a live, undisputed contract, and immediately moves it out of
-- 'activo' — this is what makes a pending proposal visible/actionable on
-- the contract page instead of just living inside its own disputes row.
create or replace function public.disputes_propose_termination()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract_id uuid;
  v_status public.contract_status;
begin
  select c.id, c.status into v_contract_id, v_status
  from public.contracts c
  join public.guarantees g on g.contract_id = c.id
  where g.id = new.guarantee_id;

  if v_status <> 'activo' then
    raise exception 'cannot open a dispute against a contract in status % (must be activo)', v_status;
  end if;

  update public.contracts set status = 'propuesta_termino' where id = v_contract_id;

  return new;
end;
$$;

create trigger disputes_propose_termination
  before insert on public.disputes
  for each row execute function public.disputes_propose_termination();

-- reject_proposal: the formal escalation path. Rejecting (as opposed to
-- countering with a new proposal) requires a stated reason and moves both
-- the dispute and the contract into the adversarial, admin-arbitrated
-- state. A rejected proposal can still be superseded by a fresh
-- counter-proposal afterward — rejection doesn't close the door on
-- negotiation, it just means a neutral third party is now watching.
create or replace function public.reject_proposal(p_proposal_id uuid, p_actor_user_id uuid, p_motivo_rechazo text)
returns public.disputes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.proposals;
  v_dispute public.disputes;
  v_contract_id uuid;
begin
  select * into v_proposal from public.proposals where id = p_proposal_id for update;
  if not found then
    raise exception 'proposal % not found', p_proposal_id;
  end if;

  if v_proposal.status <> 'pendiente' then
    raise exception 'proposal % is not pendiente (status=%)', p_proposal_id, v_proposal.status;
  end if;

  if v_proposal.created_by = p_actor_user_id then
    raise exception 'user % cannot reject their own proposal', p_actor_user_id;
  end if;

  if length(trim(coalesce(p_motivo_rechazo, ''))) < 50 then
    raise exception 'motivo_rechazo must be at least 50 characters';
  end if;

  select * into v_dispute from public.disputes where id = v_proposal.dispute_id for update;
  select g.contract_id into v_contract_id from public.guarantees g where g.id = v_dispute.guarantee_id;

  if not public.has_contract_access(
    v_contract_id, p_actor_user_id, array['arrendador', 'arrendatario']::public.contract_role[]
  ) then
    raise exception 'user % is not authorized to reject proposal %', p_actor_user_id, p_proposal_id;
  end if;

  update public.proposals set status = 'rechazada' where id = p_proposal_id;

  update public.disputes
    set status = 'escalada', motivo_rechazo = p_motivo_rechazo
    where id = v_dispute.id
    returning * into v_dispute;

  update public.contracts set status = 'en_disputa' where id = v_contract_id;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      p_actor_user_id, 'proposal.rejected', 'proposal', p_proposal_id,
      jsonb_build_object('dispute_id', v_dispute.id, 'contract_id', v_contract_id)
    );

  return v_dispute;
end;
$$;

grant execute on function public.reject_proposal(uuid, uuid, text) to authenticated;

-- disputes_select_party's underlying access check is unaffected by the new
-- column; motivo_rechazo just rides along with the rest of the row.
