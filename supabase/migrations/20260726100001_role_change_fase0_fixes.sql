-- Fase 0 of the role-change feature: three prerequisite fixes uncovered
-- while auditing whether contract history really is independent of an
-- account's current role.
--
-- 1) contract_parties already freezes arrendador/arrendatario at contract
--    creation, but never did the same for corredor — has_contract_access()
--    grants corredor access by live-checking properties.broker_organization_id
--    against current memberships, so who "was" the corredor on an old
--    contract silently drifts if the property's broker or that broker's
--    staff change later. This snapshots the broker org's current members
--    into contract_parties at creation time, going forward only — it does
--    not touch existing contracts (deliberately: we cannot know who the
--    broker rep was at each contract's original signing, only who it is
--    today, and backfilling that as if it were historical would be
--    presenting a guess as fact).
--
-- 2) create_organization() had no gate at all — any authenticated user,
--    including a pure arrendatario, could self-serve their first
--    organization (and therefore their own arrendador/corredor status) via
--    /organizations/new, which defeats the entire point of "el usuario NO
--    cambia su propio rol". Existing org admins can still self-serve
--    *additional* organizations (that's not a role change) — only the
--    zero-membership case (a first org, i.e. an actual role change) is now
--    blocked and redirected toward the request flow.
--
-- 3) can_view_audit_entry() has no branch for a role-change event, so the
--    affected user (not the admin who acted) couldn't see their own
--    audit_log row. entity_type = 'profile_role_change' uses entity_id =
--    the affected user's id (audit_log's entity_id is polymorphic/FK-less,
--    so this is a normal use of the column, just pointing at a profile
--    instead of a contract-family row).

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

  -- Snapshot today's broker-org staff as the contract's corredor(es). If the
  -- property has no broker_organization_id, or that org currently has no
  -- members, this simply inserts nothing — has_contract_access() still
  -- falls back to live derivation for those cases, same as before.
  insert into public.contract_parties (contract_id, user_id, role)
    select v_contract.id, m.user_id, 'corredor'
    from public.properties p
    join public.memberships m on m.organization_id = p.broker_organization_id
    where p.id = p_property_id and p.broker_organization_id is not null
    on conflict (contract_id, user_id) do nothing;

  return v_contract;
end;
$$;

create or replace function public.create_organization(p_type public.org_type, p_name text, p_actor_user_id uuid)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
begin
  if not public.is_platform_admin(p_actor_user_id) and not exists (
    select 1 from public.memberships m where m.user_id = p_actor_user_id
  ) then
    raise exception 'Debes solicitar un cambio de rol antes de crear tu primer participante.';
  end if;

  insert into public.organizations (type, name, created_by)
    values (p_type, p_name, p_actor_user_id)
    returning * into v_org;

  insert into public.memberships (user_id, organization_id, role)
    values (p_actor_user_id, v_org.id, 'admin');

  return v_org;
end;
$$;

create or replace function public.can_view_audit_entry(
  p_entity_type text, p_entity_id uuid, p_actor_user_id uuid, p_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_contract_id uuid;
begin
  if public.is_platform_admin(p_user_id) then
    return true;
  end if;

  if p_entity_type = 'profile_role_change' then
    return p_entity_id = p_user_id;
  end if;

  if p_entity_type = 'contract' then
    v_contract_id := p_entity_id;
  elsif p_entity_type = 'guarantee' then
    select contract_id into v_contract_id from public.guarantees where id = p_entity_id;
  elsif p_entity_type = 'dispute' then
    select g.contract_id into v_contract_id
    from public.disputes d join public.guarantees g on g.id = d.guarantee_id
    where d.id = p_entity_id;
  elsif p_entity_type = 'proposal' then
    select g.contract_id into v_contract_id
    from public.proposals pr
    join public.disputes d on d.id = pr.dispute_id
    join public.guarantees g on g.id = d.guarantee_id
    where pr.id = p_entity_id;
  end if;

  if v_contract_id is not null then
    return public.has_contract_access(
      v_contract_id, p_user_id, array['arrendador', 'arrendatario', 'corredor']::public.contract_role[]
    );
  end if;

  return p_actor_user_id = p_user_id;
end;
$$;
