-- pgTAP suite for business-logic functions that weren't directly exercised
-- by rls.test.sql or role_change.test.sql: set_kyc_status,
-- contract_guarantee_amounts, contract_interest_accrued. Same impersonation
-- pattern as the other suites, own UUID range (...0201-...0203, ...02b1-...02c3).

begin;
select plan(14);

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000201', 'kyc-admin@test.local'),
  ('00000000-0000-0000-0000-000000000202', 'kyc-target@test.local'),
  ('00000000-0000-0000-0000-000000000203', 'kyc-landlord@test.local');

update public.profiles set full_name = 'KYC Admin', is_platform_admin = true where id = '00000000-0000-0000-0000-000000000201';
update public.profiles set full_name = 'KYC Target' where id = '00000000-0000-0000-0000-000000000202';
update public.profiles set full_name = 'KYC Landlord' where id = '00000000-0000-0000-0000-000000000203';

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000002a1', 'individual', 'Fn Test Org', '00000000-0000-0000-0000-000000000203');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-0000000002a1', 'admin');

insert into public.properties (id, organization_id, address) values
  ('00000000-0000-0000-0000-0000000002b1', '00000000-0000-0000-0000-0000000002a1', 'Fn Test 1'),
  ('00000000-0000-0000-0000-0000000002b2', '00000000-0000-0000-0000-0000000002a1', 'Fn Test 2'),
  ('00000000-0000-0000-0000-0000000002b3', '00000000-0000-0000-0000-0000000002a1', 'Fn Test 3');

-- G1: unsigned, CLP guarantee — nothing frozen yet, no deposit yet.
insert into public.contracts (
  id, property_id, start_date, end_date, rent_amount, rent_currency, guarantee_currency, guarantee_amount
) values (
  '00000000-0000-0000-0000-0000000002c1', '00000000-0000-0000-0000-0000000002b1',
  '2026-01-01', '2027-01-01', 500000, 'CLP', 'CLP', 500000
);

-- G2: signed, CLP guarantee, deposit confirmed just now — interest should
-- round down to 0 (sub-second elapsed time).
insert into public.contracts (
  id, property_id, start_date, end_date, rent_amount, rent_currency,
  guarantee_currency, guarantee_amount, uf_rate_at_signing, deposit_confirmed_at
) values (
  '00000000-0000-0000-0000-0000000002c2', '00000000-0000-0000-0000-0000000002b2',
  '2026-01-01', '2027-01-01', 500000, 'CLP', 'CLP', 500000, 37279.5, now()
);

-- G3: signed, UF guarantee, deposit confirmed 10 years ago — interest
-- should be clearly positive regardless of test execution timing.
insert into public.contracts (
  id, property_id, start_date, end_date, rent_amount, rent_currency,
  guarantee_currency, guarantee_amount, uf_rate_at_signing, deposit_confirmed_at
) values (
  '00000000-0000-0000-0000-0000000002c3', '00000000-0000-0000-0000-0000000002b3',
  '2026-01-01', '2027-01-01', 500000, 'CLP', 'UF', 13.41, 37279.5, now() - interval '10 years'
);

insert into public.contract_parties (contract_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000002c1', '00000000-0000-0000-0000-000000000203', 'arrendador'),
  ('00000000-0000-0000-0000-0000000002c2', '00000000-0000-0000-0000-000000000203', 'arrendador'),
  ('00000000-0000-0000-0000-0000000002c3', '00000000-0000-0000-0000-000000000203', 'arrendador');

-- ---------------------------------------------------------------------
-- Helper: impersonate a user, same as the other suites.
-- ---------------------------------------------------------------------
create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- contract_guarantee_amounts
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000203'); -- landlord, party on all three

select is(
  (select is_frozen from public.contract_guarantee_amounts('00000000-0000-0000-0000-0000000002c1')),
  false,
  'contract_guarantee_amounts: unsigned contract is not frozen'
);
select is(
  (select amount_other from public.contract_guarantee_amounts('00000000-0000-0000-0000-0000000002c1')),
  null::numeric,
  'contract_guarantee_amounts: unsigned contract has no amount_other yet'
);
select is(
  (select currency_other from public.contract_guarantee_amounts('00000000-0000-0000-0000-0000000002c1')),
  'UF'::public.currency_code,
  'contract_guarantee_amounts: currency_other flips CLP -> UF'
);

select is(
  (select is_frozen from public.contract_guarantee_amounts('00000000-0000-0000-0000-0000000002c2')),
  true,
  'contract_guarantee_amounts: signed contract is frozen'
);
select is(
  (select amount_other from public.contract_guarantee_amounts('00000000-0000-0000-0000-0000000002c2')),
  round(500000 / 37279.5, 4),
  'contract_guarantee_amounts: CLP guarantee converts to UF by division at the frozen rate'
);

select is(
  (select currency_other from public.contract_guarantee_amounts('00000000-0000-0000-0000-0000000002c3')),
  'CLP'::public.currency_code,
  'contract_guarantee_amounts: currency_other flips UF -> CLP'
);
select is(
  (select amount_other from public.contract_guarantee_amounts('00000000-0000-0000-0000-0000000002c3')),
  round(13.41 * 37279.5, 2),
  'contract_guarantee_amounts: UF guarantee converts to CLP by multiplication at the frozen rate'
);

-- ---------------------------------------------------------------------
-- contract_interest_accrued
-- ---------------------------------------------------------------------
select is(
  public.contract_interest_accrued('00000000-0000-0000-0000-0000000002c1'),
  0::numeric,
  'contract_interest_accrued: no interest before deposit_confirmed_at is set'
);
select is(
  public.contract_interest_accrued('00000000-0000-0000-0000-0000000002c2'),
  0::numeric,
  'contract_interest_accrued: rounds down to 0 immediately after deposit is confirmed'
);
select cmp_ok(
  public.contract_interest_accrued('00000000-0000-0000-0000-0000000002c3'),
  '>',
  0::numeric,
  'contract_interest_accrued: accrues positive interest for a deposit confirmed long ago'
);

reset role;

-- ---------------------------------------------------------------------
-- set_kyc_status
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000203'); -- landlord, not a platform admin
select throws_ok(
  $$ select public.set_kyc_status('00000000-0000-0000-0000-000000000202', 'verificado') $$,
  'P0001',
  null,
  'set_kyc_status: a non-platform-admin cannot call it'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000201'); -- platform admin
select throws_ok(
  $$ select public.set_kyc_status('00000000-0000-0000-0000-000000000202', 'not-a-real-status') $$,
  'P0001',
  null,
  'set_kyc_status: rejects an invalid kyc_estado value'
);

select public.set_kyc_status('00000000-0000-0000-0000-000000000202', 'verificado');
select is(
  (select kyc_estado from public.profiles where id = '00000000-0000-0000-0000-000000000202'),
  'verificado',
  'set_kyc_status: a platform admin can set kyc_estado, and verificado follows it'
);
select is(
  (select count(*)::int from public.audit_log
     where action = 'profile.kyc_updated'
       and entity_id = '00000000-0000-0000-0000-000000000202'
       and metadata->>'kyc_estado' = 'verificado'),
  1,
  'set_kyc_status: writes an audit_log entry recording the change'
);
reset role;

select * from finish();
rollback;
