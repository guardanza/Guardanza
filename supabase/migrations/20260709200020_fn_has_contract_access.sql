-- has_contract_access: the single function every RLS policy in this system
-- calls to decide contract-scoped access. No table duplicates this logic.
--
-- Access is granted through any of three paths, filtered by p_required_roles:
--   - arrendatario: explicit row in contract_parties.
--   - arrendador:   membership in the organization that owns the property
--                    (landlords see all contracts of their properties, not
--                    just ones where they're an explicit contract_parties row).
--   - corredor:     membership in the organization delegated as broker on
--                    the property.
--
-- SECURITY DEFINER so it can read contracts/properties/memberships without
-- triggering the RLS policies that call it in the first place (which would
-- otherwise recurse). set search_path pins it against search_path hijacking.

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
    exists (
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
