-- guarantees are never inserted by a client directly — they're a system
-- consequence of a contract existing (1:1), always created with the
-- amount/currency the contract already committed to. This closes the loop
-- with guarantees_match_contract (contracts.sql migration): the only INSERT
-- path is this trigger, so the values can never disagree.

create or replace function public.contracts_create_guarantee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.guarantees (contract_id, amount, currency)
  values (new.id, new.guarantee_amount, new.guarantee_currency);
  return new;
end;
$$;

create trigger contracts_create_guarantee
  after insert on public.contracts
  for each row execute function public.contracts_create_guarantee();

revoke insert, update, delete on public.guarantees from authenticated, anon;
grant select on public.guarantees to authenticated;
