-- Bloque D groundwork: ADMIN_SISTEMA is supposed to have "visibilidad
-- total del sistema" per the spec, but nothing granted it — a platform
-- admin with no properties/contracts of their own saw an empty dashboard,
-- same as anyone else. has_contract_access() is the single function every
-- contract-scoped RLS policy in this system calls (contracts,
-- contract_parties, guarantees, disputes, ledger_entries, proposals,
-- proposal_items, signature_envelopes, documents all go through it), so
-- one bypass clause here cascades correctly everywhere instead of having
-- to touch nine separate policies.

create or replace function public.has_contract_access(
  p_contract_id uuid,
  p_user_id uuid,
  p_required_roles public.contract_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin(p_user_id)
    or exists (
      select 1
      from public.contract_parties cp
      where cp.contract_id = p_contract_id
        and cp.user_id = p_user_id
        and cp.role = any (p_required_roles)
    )
    or exists (
      select 1
      from public.contracts c
      join public.properties p on p.id = c.property_id
      join public.memberships m on m.organization_id = p.organization_id
      where c.id = p_contract_id
        and m.user_id = p_user_id
        and 'arrendador' = any (p_required_roles)
    )
    or exists (
      select 1
      from public.contracts c
      join public.properties p on p.id = c.property_id
      join public.memberships m on m.organization_id = p.broker_organization_id
      where c.id = p_contract_id
        and m.user_id = p_user_id
        and 'corredor' = any (p_required_roles)
    );
$$;

grant execute on function public.has_contract_access(uuid, uuid, public.contract_role[]) to authenticated;

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

-- "Gestión de Empresas": admin can list every organization and property,
-- not just ones they belong to.
drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations
  for select to authenticated
  using (public.is_org_member(public.organizations.id, auth.uid()) or public.is_platform_admin(auth.uid()));

drop policy if exists properties_select_member on public.properties;
create policy properties_select_member on public.properties
  for select to authenticated
  using (
    public.is_org_member(properties.organization_id, auth.uid())
    or public.is_org_member(properties.broker_organization_id, auth.uid())
    or public.is_platform_admin(auth.uid())
  );
