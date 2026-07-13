-- RLS: enabled on every table, deny-by-default (no policy = no access).
-- Every contract-scoped policy calls has_contract_access() — no table
-- re-implements that logic.
--
-- Note: Supabase no longer auto-exposes new public-schema tables to the
-- anon/authenticated API roles (auto_expose_new_tables is unset/false by
-- default) — RLS policies only filter ROWS, they don't imply the
-- table-level GRANT a role needs to even attempt the query. Every table
-- below gets an explicit `grant ... to authenticated` alongside its
-- policies; tables that are function-only writes (ledger_entries,
-- guarantees, audit_log, signature_envelopes) already got their grants in
-- their own migration files.

-- ---------------------------------------------------------------------
-- Helper: is this user an admin of any organization? Used to gate the
-- repair catalog (Fase A has no separate platform-admin concept — an org
-- admin managing the shared catalog is the pragmatic stand-in).
-- ---------------------------------------------------------------------
create or replace function public.is_any_org_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = p_user_id and m.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- Helpers: organization membership checks. SECURITY DEFINER is not
-- optional here — memberships has its own RLS policy (below) that itself
-- needs to check "is this user a member of this org", so a plain subquery
-- against memberships from within that policy would recurse into itself
-- forever ("infinite recursion detected in policy for relation
-- memberships"). Every policy in this file that needs to check org
-- membership goes through these functions instead of querying
-- memberships directly.
-- ---------------------------------------------------------------------
create or replace function public.is_org_member(p_organization_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = p_organization_id and m.user_id = p_user_id
  );
$$;

create or replace function public.is_org_admin(p_organization_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = p_organization_id and m.user_id = p_user_id and m.role = 'admin'
  );
$$;

create or replace function public.org_has_any_members(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.memberships m where m.organization_id = p_organization_id);
$$;

create or replace function public.shares_org_with(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m1
    join public.memberships m2 on m2.organization_id = m1.organization_id
    where m1.user_id = p_user_a and m2.user_id = p_user_b
  );
$$;

-- ---------------------------------------------------------------------
-- Helper: can this user see an audit_log row, given its polymorphic
-- entity_type/entity_id? Resolves the entity back to a contract wherever
-- possible; falls back to "only your own actions" otherwise.
-- ---------------------------------------------------------------------
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

-- =======================================================================
-- profiles
-- =======================================================================
alter table public.profiles enable row level security;
grant select, update on public.profiles to authenticated;

create policy profiles_select_self_or_shared on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.contract_parties cp1
      join public.contract_parties cp2 on cp2.contract_id = cp1.contract_id
      where cp1.user_id = auth.uid() and cp2.user_id = public.profiles.id
    )
    or public.shares_org_with(auth.uid(), public.profiles.id)
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- =======================================================================
-- organizations
-- =======================================================================
alter table public.organizations enable row level security;
grant select, insert, update on public.organizations to authenticated;

create policy organizations_select_member on public.organizations
  for select to authenticated
  using (public.is_org_member(public.organizations.id, auth.uid()));

create policy organizations_insert_self on public.organizations
  for insert to authenticated
  with check (created_by = auth.uid());

create policy organizations_update_admin on public.organizations
  for update to authenticated
  using (public.is_org_admin(public.organizations.id, auth.uid()));

-- =======================================================================
-- memberships
-- =======================================================================
alter table public.memberships enable row level security;
grant select, insert on public.memberships to authenticated;

create policy memberships_select_same_org on public.memberships
  for select to authenticated
  using (public.is_org_member(public.memberships.organization_id, auth.uid()));

create policy memberships_insert_admin_or_self_bootstrap on public.memberships
  for insert to authenticated
  with check (
    -- Founder bootstrapping their own org, or an existing admin adding someone.
    (user_id = auth.uid() and exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.created_by = auth.uid()
    ) and not public.org_has_any_members(organization_id))
    or public.is_org_admin(memberships.organization_id, auth.uid())
  );

-- =======================================================================
-- properties
-- =======================================================================
alter table public.properties enable row level security;
grant select, insert, update on public.properties to authenticated;

create policy properties_select_member on public.properties
  for select to authenticated
  using (
    public.is_org_member(properties.organization_id, auth.uid())
    or public.is_org_member(properties.broker_organization_id, auth.uid())
  );

create policy properties_insert_admin on public.properties
  for insert to authenticated
  with check (public.is_org_admin(properties.organization_id, auth.uid()));

create policy properties_update_admin on public.properties
  for update to authenticated
  using (public.is_org_admin(properties.organization_id, auth.uid()));

-- =======================================================================
-- contracts
-- =======================================================================
alter table public.contracts enable row level security;
grant select, insert, update on public.contracts to authenticated;

create policy contracts_select_party on public.contracts
  for select to authenticated
  using (public.has_contract_access(
    id, auth.uid(), array['arrendador', 'arrendatario', 'corredor']::public.contract_role[]
  ));

create policy contracts_insert_landlord_admin on public.contracts
  for insert to authenticated
  with check (exists (
    select 1 from public.properties p
    where p.id = property_id and public.is_org_admin(p.organization_id, auth.uid())
  ));

-- Direct client edits only while still a draft — every later transition
-- (signing, disputes, finalization) happens through the SECURITY DEFINER
-- functions, which bypass RLS entirely and are unaffected by this policy.
create policy contracts_update_draft_landlord on public.contracts
  for update to authenticated
  using (
    status = 'borrador'
    and public.has_contract_access(id, auth.uid(), array['arrendador']::public.contract_role[])
  );

-- =======================================================================
-- contract_parties
-- =======================================================================
alter table public.contract_parties enable row level security;
grant select, insert on public.contract_parties to authenticated;

create policy contract_parties_select_party on public.contract_parties
  for select to authenticated
  using (public.has_contract_access(
    contract_id, auth.uid(), array['arrendador', 'arrendatario', 'corredor']::public.contract_role[]
  ));

create policy contract_parties_insert_draft_landlord on public.contract_parties
  for insert to authenticated
  with check (
    exists (select 1 from public.contracts c where c.id = contract_id and c.status = 'borrador')
    and public.has_contract_access(contract_id, auth.uid(), array['arrendador']::public.contract_role[])
  );

-- =======================================================================
-- guarantees (insert/update/delete already revoked from client roles)
-- =======================================================================
alter table public.guarantees enable row level security;

create policy guarantees_select_party on public.guarantees
  for select to authenticated
  using (public.has_contract_access(
    contract_id, auth.uid(), array['arrendador', 'arrendatario', 'corredor']::public.contract_role[]
  ));

-- =======================================================================
-- disputes
-- =======================================================================
alter table public.disputes enable row level security;
grant select, insert on public.disputes to authenticated;

create policy disputes_select_party on public.disputes
  for select to authenticated
  using (exists (
    select 1 from public.guarantees g
    where g.id = disputes.guarantee_id
      and public.has_contract_access(
        g.contract_id, auth.uid(), array['arrendador', 'arrendatario', 'corredor']::public.contract_role[]
      )
  ));

create policy disputes_insert_party on public.disputes
  for insert to authenticated
  with check (
    opened_by = auth.uid()
    and exists (
      select 1 from public.guarantees g
      where g.id = disputes.guarantee_id
        and public.has_contract_access(g.contract_id, auth.uid(), array['arrendador', 'arrendatario']::public.contract_role[])
    )
  );

-- =======================================================================
-- ledger_entries (insert/update/delete already revoked from client roles)
-- =======================================================================
alter table public.ledger_entries enable row level security;

create policy ledger_entries_select_party on public.ledger_entries
  for select to authenticated
  using (exists (
    select 1 from public.guarantees g
    where g.id = ledger_entries.guarantee_id
      and public.has_contract_access(
        g.contract_id, auth.uid(), array['arrendador', 'arrendatario', 'corredor']::public.contract_role[]
      )
  ));

-- =======================================================================
-- proposals (update/delete already revoked from client roles)
-- =======================================================================
alter table public.proposals enable row level security;
grant select, insert on public.proposals to authenticated;

create policy proposals_select_party on public.proposals
  for select to authenticated
  using (exists (
    select 1 from public.disputes d
    join public.guarantees g on g.id = d.guarantee_id
    where d.id = proposals.dispute_id
      and public.has_contract_access(
        g.contract_id, auth.uid(), array['arrendador', 'arrendatario', 'corredor']::public.contract_role[]
      )
  ));

create policy proposals_insert_party on public.proposals
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.disputes d
      join public.guarantees g on g.id = d.guarantee_id
      where d.id = proposals.dispute_id
        and public.has_contract_access(g.contract_id, auth.uid(), array['arrendador', 'arrendatario']::public.contract_role[])
    )
  );

-- =======================================================================
-- proposal_items (update/delete already revoked from client roles)
-- =======================================================================
alter table public.proposal_items enable row level security;
grant select, insert on public.proposal_items to authenticated;

create policy proposal_items_select_party on public.proposal_items
  for select to authenticated
  using (exists (
    select 1 from public.proposals pr
    join public.disputes d on d.id = pr.dispute_id
    join public.guarantees g on g.id = d.guarantee_id
    where pr.id = proposal_items.proposal_id
      and public.has_contract_access(
        g.contract_id, auth.uid(), array['arrendador', 'arrendatario', 'corredor']::public.contract_role[]
      )
  ));

create policy proposal_items_insert_own_proposal on public.proposal_items
  for insert to authenticated
  with check (exists (
    select 1 from public.proposals pr
    where pr.id = proposal_items.proposal_id and pr.created_by = auth.uid() and pr.status = 'pendiente'
  ));

-- =======================================================================
-- repair_reference / repair_reference_versions
-- Shared catalog: readable by anyone authenticated, writable by org admins.
-- =======================================================================
alter table public.repair_reference enable row level security;
grant select, insert, update, delete on public.repair_reference to authenticated;

create policy repair_reference_select_all on public.repair_reference
  for select to authenticated using (true);

create policy repair_reference_write_admin on public.repair_reference
  for all to authenticated
  using (public.is_any_org_admin(auth.uid()))
  with check (public.is_any_org_admin(auth.uid()));

alter table public.repair_reference_versions enable row level security;
grant select, insert on public.repair_reference_versions to authenticated;

create policy repair_reference_versions_select_all on public.repair_reference_versions
  for select to authenticated using (true);

create policy repair_reference_versions_insert_admin on public.repair_reference_versions
  for insert to authenticated
  with check (public.is_any_org_admin(auth.uid()));

-- Closing valid_to (the only update the table's own trigger allows) is also
-- admin-only.
create policy repair_reference_versions_update_admin on public.repair_reference_versions
  for update to authenticated
  using (public.is_any_org_admin(auth.uid()));

-- =======================================================================
-- documents
-- =======================================================================
alter table public.documents enable row level security;
grant select, insert on public.documents to authenticated;

create policy documents_select_party on public.documents
  for select to authenticated
  using (public.has_contract_access(
    contract_id, auth.uid(), array['arrendador', 'arrendatario', 'corredor']::public.contract_role[]
  ));

create policy documents_insert_party on public.documents
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.has_contract_access(
      contract_id, auth.uid(), array['arrendador', 'arrendatario', 'corredor']::public.contract_role[]
    )
  );

-- =======================================================================
-- signature_envelopes (insert/update only via sign_contract)
-- =======================================================================
alter table public.signature_envelopes enable row level security;
grant select on public.signature_envelopes to authenticated;

create policy signature_envelopes_select_party on public.signature_envelopes
  for select to authenticated
  using (public.has_contract_access(
    contract_id, auth.uid(), array['arrendador', 'arrendatario', 'corredor']::public.contract_role[]
  ));

revoke insert, update, delete on public.signature_envelopes from authenticated, anon;

-- =======================================================================
-- screenings / consents — self-service only in Fase A
-- =======================================================================
alter table public.screenings enable row level security;
grant select, insert on public.screenings to authenticated;

create policy screenings_select_own on public.screenings
  for select to authenticated using (user_id = auth.uid());

create policy screenings_insert_own on public.screenings
  for insert to authenticated with check (user_id = auth.uid());

alter table public.consents enable row level security;
grant select, insert on public.consents to authenticated;

create policy consents_select_own on public.consents
  for select to authenticated using (user_id = auth.uid());

create policy consents_insert_own on public.consents
  for insert to authenticated with check (user_id = auth.uid());

-- =======================================================================
-- audit_log (insert/update/delete already revoked from client roles)
-- =======================================================================
alter table public.audit_log enable row level security;

create policy audit_log_select_visible on public.audit_log
  for select to authenticated
  using (public.can_view_audit_entry(entity_type, entity_id, actor_user_id, auth.uid()));
