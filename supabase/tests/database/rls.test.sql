-- pgTAP suite for RLS. Run with `supabase test db` (spins up the full local
-- stack including auth.uid()/auth.users, so no mocking needed here).
--
-- Pattern: seed fixture data as the privileged test-runner role (bypasses
-- RLS), then `set local role authenticated` + set the request.jwt.claims
-- GUC to impersonate a specific user for each assertion, exactly like
-- Supabase does with a real JWT.

begin;
select plan(13);

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'landlord@test.local'),
  ('00000000-0000-0000-0000-000000000002', 'tenant@test.local'),
  ('00000000-0000-0000-0000-000000000003', 'broker-agent@test.local'),
  ('00000000-0000-0000-0000-000000000004', 'other-broker-agent@test.local'),
  ('00000000-0000-0000-0000-000000000005', 'outsider@test.local');

-- profiles rows are auto-created by handle_new_user(); fill in names.
update public.profiles set full_name = 'Landlord' where id = '00000000-0000-0000-0000-000000000001';
update public.profiles set full_name = 'Tenant' where id = '00000000-0000-0000-0000-000000000002';
update public.profiles set full_name = 'Broker Agent' where id = '00000000-0000-0000-0000-000000000003';
update public.profiles set full_name = 'Other Broker Agent' where id = '00000000-0000-0000-0000-000000000004';
update public.profiles set full_name = 'Outsider' where id = '00000000-0000-0000-0000-000000000005';

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000000a1', 'individual', 'Landlord Org', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-0000000000a2', 'broker', 'Broker Org', '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-0000000000a3', 'broker', 'Other Broker Org', '00000000-0000-0000-0000-000000000004');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'admin'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a2', 'admin'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a3', 'admin');

insert into public.properties (id, organization_id, broker_organization_id, address) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', 'Calle Falsa 123');

insert into public.contracts (
  id, property_id, start_date, end_date, rent_amount, rent_currency, guarantee_currency, guarantee_amount
) values (
  '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1',
  '2026-01-01', '2027-01-01', 500000, 'CLP', 'CLP', 500000
);

insert into public.contract_parties (contract_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001', 'arrendador'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000002', 'arrendatario');

-- guarantees row was auto-created by the contracts_create_guarantee trigger.
insert into public.disputes (id, guarantee_id, opened_by)
  select '00000000-0000-0000-0000-0000000000d1', g.id, '00000000-0000-0000-0000-000000000002'
  from public.guarantees g where g.contract_id = '00000000-0000-0000-0000-0000000000c1';

insert into public.proposals (id, dispute_id, created_by, total_amount)
values (
  '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1',
  '00000000-0000-0000-0000-000000000001', 100000
);

-- ---------------------------------------------------------------------
-- Helper: impersonate a user the way PostgREST/Supabase would for a
-- request carrying their JWT.
-- ---------------------------------------------------------------------
create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- Positive controls — confirm legitimate access actually works, so the
-- negative assertions below aren't just "everything is blocked".
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000002'); -- tenant, party on C1
select is(
  (select count(*)::int from public.contracts where id = '00000000-0000-0000-0000-0000000000c1'),
  1,
  'tenant who IS party on the contract can read it'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000003'); -- broker agent, delegated org
select is(
  (select count(*)::int from public.contracts where id = '00000000-0000-0000-0000-0000000000c1'),
  1,
  'broker whose org IS delegated on the property can read the contract'
);
reset role;

-- ---------------------------------------------------------------------
-- Required negative assertions
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000005'); -- outsider, no ties at all
select is_empty(
  $$ select 1 from public.contracts where id = '00000000-0000-0000-0000-0000000000c1' $$,
  'a tenant NOT party to the contract cannot read it'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000004'); -- other broker org's agent
select is_empty(
  $$ select 1 from public.contracts where id = '00000000-0000-0000-0000-0000000000c1' $$,
  'a broker whose org is NOT delegated on the property cannot read the contract'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000002'); -- tenant, party on C1
select throws_ok(
  $$
    insert into public.ledger_entries (guarantee_id, entry_type, amount, currency, direction)
    select id, 'ajuste', 1, 'CLP', 'debe' from public.guarantees where contract_id = '00000000-0000-0000-0000-0000000000c1'
  $$,
  '42501',
  null,
  'a user cannot insert directly into ledger_entries'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000001'); -- landlord, created the proposal
select throws_ok(
  $$ update public.proposals set status = 'rechazada' where id = '00000000-0000-0000-0000-0000000000e1' $$,
  '42501',
  null,
  'a user cannot update an existing proposal'
);
select throws_ok(
  $$ delete from public.proposals where id = '00000000-0000-0000-0000-0000000000e1' $$,
  '42501',
  null,
  'a user cannot delete an existing proposal'
);
reset role;

-- Supersession is the only legitimate way to "change" a proposal — a new
-- INSERT, still allowed for a contract party.
select pg_temp.login_as('00000000-0000-0000-0000-000000000001');
select lives_ok(
  $$
    insert into public.proposals (dispute_id, created_by, total_amount, supersedes_proposal_id)
    values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000001', 80000, '00000000-0000-0000-0000-0000000000e1')
  $$,
  'a contract party CAN supersede a proposal via a new INSERT'
);
reset role;

select is(
  (select status::text from public.proposals where id = '00000000-0000-0000-0000-0000000000e1'),
  'superada',
  'the superseded proposal was automatically marked as superada'
);

-- ---------------------------------------------------------------------
-- org_code + lookup_organization_by_code(): a landlord referencing a
-- broker they're not a member of needs a way to find it — org_code is a
-- shareable invite-style code, and the lookup function deliberately
-- bypasses the "must be a member to see this org" RLS rule for it.
-- ---------------------------------------------------------------------
select ok(
  (select org_code from public.organizations where id = '00000000-0000-0000-0000-0000000000a2') ~ '^[0-9]{6}$',
  'organizations get an auto-generated 6-digit org_code'
);

-- Capture the codes as superuser (bypasses RLS) BEFORE impersonating the
-- outsider below — in the real app the code always arrives as plain text
-- typed into a form, never re-queried from organizations by the caller, so
-- fetching it here under the outsider's own restricted role would test a
-- path the app never takes (and would fail RLS for an unrelated reason).
select org_code as broker_code from public.organizations where id = '00000000-0000-0000-0000-0000000000a2' \gset
select org_code as individual_code from public.organizations where id = '00000000-0000-0000-0000-0000000000a1' \gset

select pg_temp.login_as('00000000-0000-0000-0000-000000000005'); -- outsider — not a member of Broker Org at all
select is(
  (select count(*)::int from public.lookup_organization_by_code(:'broker_code')),
  1,
  'lookup_organization_by_code finds a broker org by its code, even for a non-member (invite-link trust model)'
);

select is(
  (select count(*)::int from public.lookup_organization_by_code(:'individual_code')),
  0,
  'lookup_organization_by_code refuses a code belonging to a non-broker (individual) organization'
);

select is(
  (select count(*)::int from public.lookup_organization_by_code('000000')),
  0,
  'lookup_organization_by_code returns nothing for an unknown code'
);
reset role;

select * from finish();
rollback;
