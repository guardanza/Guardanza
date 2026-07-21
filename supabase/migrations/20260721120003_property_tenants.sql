-- property_tenants: lets a landlord/broker mark a prospective or current
-- tenant directly on a property, independent of any contract — useful
-- while negotiating, before a contract exists. Deliberately NOT the same
-- as contract_parties, which represents the parties bound by a *signed*
-- contract; a property can have several prospective tenants over time,
-- only one of which may ever get a contract.
create table public.property_tenants (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (property_id, user_id)
);

create index property_tenants_property_id_idx on public.property_tenants (property_id);
create index property_tenants_user_id_idx on public.property_tenants (user_id);

alter table public.property_tenants enable row level security;
grant select, insert, delete on public.property_tenants to authenticated, service_role;

-- Same visibility boundary as the property itself (owner org member or
-- delegated broker org member), plus the tenant can see their own rows.
create policy property_tenants_select on public.property_tenants
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.properties p
      where p.id = property_tenants.property_id
        and (public.is_org_member(p.organization_id, auth.uid()) or public.is_org_member(p.broker_organization_id, auth.uid()))
    )
  );

-- Only an admin of the owning org or the delegated broker org can add/remove.
create policy property_tenants_insert on public.property_tenants
  for insert to authenticated
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_tenants.property_id
        and (public.is_org_admin(p.organization_id, auth.uid()) or public.is_org_admin(p.broker_organization_id, auth.uid()))
    )
  );

create policy property_tenants_delete on public.property_tenants
  for delete to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_tenants.property_id
        and (public.is_org_admin(p.organization_id, auth.uid()) or public.is_org_admin(p.broker_organization_id, auth.uid()))
    )
  );
