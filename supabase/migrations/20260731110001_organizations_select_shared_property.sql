-- Fixes a gap found while verifying Tanda A's copropietarios list: seeing
-- a property is not the same as seeing every organization tied to it.
-- properties_select_member (20260721220001) lets you see a property if
-- you're a member of its owning org OR its broker org — but organizations
-- has its own separate RLS (organizations_select_member: member or
-- creator only), so the *name* of a co-owner or broker you don't
-- personally administer silently disappears from any nested
-- organizations(...) select, even though the property itself, and the
-- property_landlords row linking to that org, are both visible.
--
-- Verified empirically before writing this: as the property's own owner,
-- `select * from property_landlords` correctly returned the co-owner's
-- row, but `select * from organizations where id = <that co-owner>`
-- returned zero rows under the same session.
--
-- Same shape as properties_select_member's own criteria, extended to
-- cover property_landlords: you can see an organization's name if it's
-- tied (as owner, broker, or copropietario) to some property you can
-- already see. Additive — the existing member/creator/admin policies on
-- organizations are untouched, Postgres ORs every SELECT policy for the
-- same role together.
create policy organizations_select_shared_property on public.organizations
  for select to authenticated
  using (
    exists (
      select 1 from public.properties p
      where (
        p.organization_id = organizations.id
        or p.broker_organization_id = organizations.id
        or exists (
          select 1 from public.property_landlords pl
          where pl.property_id = p.id and pl.organization_id = organizations.id
        )
      )
      and (
        public.is_org_member(p.organization_id, auth.uid())
        or public.is_org_member(p.broker_organization_id, auth.uid())
      )
    )
  );
