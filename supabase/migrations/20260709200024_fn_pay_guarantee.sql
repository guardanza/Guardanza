-- pay_guarantee: the only way a guarantee ever gets marked paid/in custody.
-- SECURITY DEFINER because it must write ledger_entries/audit_log (both
-- locked down against direct client writes) — so it does its own
-- authorization check via has_contract_access instead of relying on RLS.
--
-- Fase A note: funding_mode is always 'simulated' right now, so "paid" and
-- "in custody" collapse into a single step (no real custodian confirming
-- receipt yet). guarantee_status keeps 'pagada' as a distinct value for
-- when funding_mode = 'real' introduces a gap between payment and the
-- custodian confirming receipt.

create or replace function public.pay_guarantee(p_guarantee_id uuid, p_actor_user_id uuid)
returns public.guarantees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guarantee public.guarantees;
  v_contract_id uuid;
  v_ledger_id uuid;
begin
  select g.* into v_guarantee
  from public.guarantees g
  where g.id = p_guarantee_id
  for update;

  if not found then
    raise exception 'guarantee % not found', p_guarantee_id;
  end if;

  v_contract_id := v_guarantee.contract_id;

  if not public.has_contract_access(v_contract_id, p_actor_user_id, array['arrendatario']::public.contract_role[]) then
    raise exception 'user % is not authorized to pay guarantee %', p_actor_user_id, p_guarantee_id;
  end if;

  if v_guarantee.status <> 'pendiente' then
    raise exception 'guarantee % is not pendiente (status=%)', p_guarantee_id, v_guarantee.status;
  end if;

  update public.guarantees
    set status = 'en_custodia'
    where id = p_guarantee_id
    returning * into v_guarantee;

  insert into public.ledger_entries (guarantee_id, entry_type, amount, currency, direction, metadata)
    values (
      p_guarantee_id, 'garantia_recibida', v_guarantee.amount, v_guarantee.currency, 'debe',
      jsonb_build_object('funding_mode', v_guarantee.funding_mode)
    )
    returning id into v_ledger_id;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    values (
      p_actor_user_id, 'guarantee.paid', 'guarantee', p_guarantee_id,
      jsonb_build_object('ledger_entry_id', v_ledger_id, 'contract_id', v_contract_id)
    );

  return v_guarantee;
end;
$$;

grant execute on function public.pay_guarantee(uuid, uuid) to authenticated;
