-- create_contract: INSERT ... RETURNING on contracts from a plain client
-- request can never work under RLS here — contracts_select_party calls
-- has_contract_access(id, ...), which resolves property_id by re-querying
-- public.contracts by that same id. A row being inserted by the current
-- command isn't visible yet to a nested subquery re-scanning the same
-- table within that command, so the RETURNING-time SELECT-policy check
-- always sees zero rows and fails — regardless of how legitimate the
-- insert is. Every other table's policies join OUTWARD from the new row's
-- own FK column to a *different* table, so they don't hit this; contracts
-- is the one case where the access check is inherently self-referential.
-- SECURITY DEFINER sidesteps it by bypassing RLS for the INSERT entirely.

create or replace function public.create_contract(
  p_property_id uuid,
  p_start_date date,
  p_end_date date,
  p_rent_amount numeric,
  p_rent_currency public.currency_code,
  p_guarantee_currency public.currency_code,
  p_guarantee_amount numeric,
  p_actor_user_id uuid
)
returns public.contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.contracts;
begin
  if not exists (
    select 1 from public.properties p
    where p.id = p_property_id and public.is_org_admin(p.organization_id, p_actor_user_id)
  ) then
    raise exception 'user % is not authorized to create a contract for property %', p_actor_user_id, p_property_id;
  end if;

  insert into public.contracts (
    property_id, start_date, end_date, rent_amount, rent_currency, guarantee_currency, guarantee_amount
  )
  values (p_property_id, p_start_date, p_end_date, p_rent_amount, p_rent_currency, p_guarantee_currency, p_guarantee_amount)
  returning * into v_contract;

  insert into public.contract_parties (contract_id, user_id, role)
    values (v_contract.id, p_actor_user_id, 'arrendador');

  return v_contract;
end;
$$;

grant execute on function public.create_contract(
  uuid, date, date, numeric, public.currency_code, public.currency_code, numeric, uuid
) to authenticated;

-- Client no longer INSERTs contracts directly.
drop policy if exists contracts_insert_landlord_admin on public.contracts;
drop policy if exists contract_parties_insert_draft_landlord on public.contract_parties;

-- The tenant invite step still needs to INSERT its own contract_parties row
-- client-side (it needs the looked-up tenant id from the app layer, which
-- create_contract has no way to resolve). Re-added without the landlord
-- self-insert case, since create_contract now covers that.
create policy contract_parties_insert_draft_landlord on public.contract_parties
  for insert to authenticated
  with check (
    exists (select 1 from public.contracts c where c.id = contract_id and c.status = 'borrador')
    and public.has_contract_access(contract_id, auth.uid(), array['arrendador']::public.contract_role[])
  );
