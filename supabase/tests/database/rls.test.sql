-- pgTAP suite for RLS. Run with `supabase test db` (spins up the full local
-- stack including auth.uid()/auth.users, so no mocking needed here).
--
-- Pattern: seed fixture data as the privileged test-runner role (bypasses
-- RLS), then `set local role authenticated` + set the request.jwt.claims
-- GUC to impersonate a specific user for each assertion, exactly like
-- Supabase does with a real JWT.

begin;
select plan(53);

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
-- This fixture predates C1 ever being signed/paid (that happens further
-- down, in the contract-state-machine block), so disputes_propose_termination
-- — which requires the contract to already be 'activo' — is disabled just
-- for this one seed insert. The RLS assertions that use D1/E1 below only
-- care about proposals/ledger_entries table-level access, not contract
-- status, so this doesn't weaken anything they're actually testing.
alter table public.disputes disable trigger disputes_propose_termination;
insert into public.disputes (id, guarantee_id, opened_by)
  select '00000000-0000-0000-0000-0000000000d1', g.id, '00000000-0000-0000-0000-000000000002'
  from public.guarantees g where g.contract_id = '00000000-0000-0000-0000-0000000000c1';
alter table public.disputes enable trigger disputes_propose_termination;

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
-- Contract state machine: sequential signing, deposit gate, cancellation.
-- ---------------------------------------------------------------------
select is(
  (select status::text from public.contracts where id = '00000000-0000-0000-0000-0000000000c1'),
  'pendiente_firma_arrendador',
  'a new contract starts in pendiente_firma_arrendador'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000005'); -- outsider
select throws_ok(
  $$ select public.sign_contract_landlord('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000005') $$,
  'P0001',
  null,
  'an outsider cannot sign a contract as arrendador'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000002'); -- tenant, wrong role
select throws_ok(
  $$ select public.sign_contract_landlord('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000002') $$,
  'P0001',
  null,
  'the tenant cannot sign a contract as arrendador'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000001'); -- landlord
select lives_ok(
  $$ select public.sign_contract_landlord('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001') $$,
  'the landlord can sign the contract'
);
reset role;

select is(
  (select status::text from public.contracts where id = '00000000-0000-0000-0000-0000000000c1'),
  'pendiente_firma_arrendatario',
  'signing as landlord advances the contract to pendiente_firma_arrendatario'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000001'); -- landlord again
select throws_ok(
  $$ select public.sign_contract_landlord('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001') $$,
  'P0001',
  null,
  'the landlord cannot sign twice'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000001'); -- landlord, wrong role for tenant sign
select throws_ok(
  $$ select public.sign_contract_tenant('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001') $$,
  'P0001',
  null,
  'the landlord cannot sign as arrendatario'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000002'); -- tenant
select lives_ok(
  $$ select public.sign_contract_tenant('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000002') $$,
  'the tenant can sign after the landlord'
);
reset role;

select is(
  (select status::text from public.contracts where id = '00000000-0000-0000-0000-0000000000c1'),
  'pendiente_deposito',
  'both signatures move the contract to pendiente_deposito'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000001'); -- landlord, wrong role for deposit
select throws_ok(
  $$
    select public.pay_guarantee(g.id, '00000000-0000-0000-0000-000000000001')
    from public.guarantees g where g.contract_id = '00000000-0000-0000-0000-0000000000c1'
  $$,
  'P0001',
  null,
  'only the arrendatario can pay the guarantee'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000002'); -- tenant
select lives_ok(
  $$
    select public.pay_guarantee(g.id, '00000000-0000-0000-0000-000000000002')
    from public.guarantees g where g.contract_id = '00000000-0000-0000-0000-0000000000c1'
  $$,
  'the tenant can pay the guarantee once both signatures are in'
);
reset role;

select is(
  (select status::text from public.contracts where id = '00000000-0000-0000-0000-0000000000c1'),
  'activo',
  'paying the guarantee activates the contract'
);

select is(
  (select deposit_bank_tx_id is not null from public.contracts where id = '00000000-0000-0000-0000-0000000000c1'),
  true,
  'activating the contract records a simulated deposit reference'
);

-- Cancellation is only reachable pre-deposit — needs its own fresh contract
-- since C1 is already activo above.
insert into public.contracts (
  id, property_id, start_date, end_date, rent_amount, rent_currency, guarantee_currency, guarantee_amount
) values (
  '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1',
  '2026-02-01', '2027-02-01', 400000, 'CLP', 'CLP', 400000
);
insert into public.contract_parties (contract_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000001', 'arrendador'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000002', 'arrendatario');

select pg_temp.login_as('00000000-0000-0000-0000-000000000002'); -- tenant can cancel too, not just landlord
select lives_ok(
  $$ select public.cancel_contract('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000002') $$,
  'a party can cancel a contract before the deposit is confirmed'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.cancel_contract('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000001') $$,
  'P0001',
  null,
  'a cancelled contract cannot be cancelled again'
);
reset role;

-- ---------------------------------------------------------------------
-- system_config: simulated comisiones/intereses parameters.
-- ---------------------------------------------------------------------
select is(
  (select comision_guardanza_pct from public.system_config where id = true),
  0.05,
  'system_config seeds a default comisión Guardanza of 5%'
);

select is(
  (select comision_guardanza_monto from public.contracts where id = '00000000-0000-0000-0000-0000000000c1'),
  25000.00,
  'paying the guarantee freezes comisión Guardanza at the rate in force (5% of 500000)'
);

select is(
  (select comision_corredor_monto from public.contracts where id = '00000000-0000-0000-0000-0000000000c1'),
  15000.00,
  'paying the guarantee also freezes comisión corredor, since the property has a delegated broker (3% of 500000)'
);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000006', 'platform-admin@test.local');
update public.profiles set full_name = 'Platform Admin', is_platform_admin = true where id = '00000000-0000-0000-0000-000000000006';

select pg_temp.login_as('00000000-0000-0000-0000-000000000001'); -- landlord, not platform admin
select throws_ok(
  $$ select public.update_system_config(0.10, 0.05, 0.03, '00000000-0000-0000-0000-000000000001') $$,
  'P0001',
  null,
  'a non-platform-admin cannot update system_config'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000006'); -- platform admin
select lives_ok(
  $$ select public.update_system_config(0.10, 0.05, 0.03, '00000000-0000-0000-0000-000000000006') $$,
  'a platform admin can update system_config'
);
reset role;

select is(
  (select comision_guardanza_pct from public.system_config where id = true),
  0.10,
  'the updated comisión Guardanza rate is persisted'
);

-- ---------------------------------------------------------------------
-- Platform admin: "visibilidad total del sistema" — sees contracts,
-- organizations and properties they have no membership/party tie to at
-- all, via the has_contract_access() bypass.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000006'); -- platform admin, no ties to C1/a1/b1
select is(
  (select count(*)::int from public.contracts where id = '00000000-0000-0000-0000-0000000000c1'),
  1,
  'platform admin can read a contract they are not a party to'
);
select is(
  (select count(*)::int from public.organizations where id = '00000000-0000-0000-0000-0000000000a1'),
  1,
  'platform admin can read an organization they are not a member of'
);
select is(
  (select count(*)::int from public.properties where id = '00000000-0000-0000-0000-0000000000b1'),
  1,
  'platform admin can read a property outside their own organizations'
);
reset role;

-- ---------------------------------------------------------------------
-- Propuestas de arreglo: a fresh proposal is lightweight (propuesta_termino),
-- it only escalates into a formal en_disputa if explicitly rejected.
-- C1 is 'activo' at this point (driven there by the state-machine block
-- above), so this exercises disputes_propose_termination for real.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000001'); -- landlord
select lives_ok(
  $$
    insert into public.disputes (id, guarantee_id, opened_by)
    select '00000000-0000-0000-0000-0000000000d2', g.id, '00000000-0000-0000-0000-000000000001'
    from public.guarantees g where g.contract_id = '00000000-0000-0000-0000-0000000000c1'
  $$,
  'a party can open a proposal against an activo contract'
);
reset role;

select is(
  (select status::text from public.contracts where id = '00000000-0000-0000-0000-0000000000c1'),
  'propuesta_termino',
  'opening a proposal moves the contract to propuesta_termino, not straight to a formal dispute'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000001');
select throws_ok(
  $$
    insert into public.disputes (guarantee_id, opened_by)
    select g.id, '00000000-0000-0000-0000-000000000001'
    from public.guarantees g where g.contract_id = '00000000-0000-0000-0000-0000000000c1'
  $$,
  'P0001',
  null,
  'a second proposal cannot be opened once the contract is no longer activo'
);
insert into public.proposals (id, dispute_id, created_by, total_amount)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000001', 50000);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000002'); -- tenant
select throws_ok(
  $$ select public.reject_proposal('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000002', 'too short') $$,
  'P0001',
  null,
  'rejecting a proposal requires a motivo_rechazo of at least 50 characters'
);

select lives_ok(
  $$
    select public.reject_proposal(
      '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000002',
      'Los daños fotografiados ya estaban presentes antes de mi ingreso al inmueble, según consta en el informe inicial.'
    )
  $$,
  'the tenant can reject a proposal with a valid reason, escalating to a formal dispute'
);
reset role;

select is(
  (select status::text from public.disputes where id = '00000000-0000-0000-0000-0000000000d2'),
  'escalada',
  'rejecting the proposal escalates the dispute to escalada'
);

select is(
  (select status::text from public.contracts where id = '00000000-0000-0000-0000-0000000000c1'),
  'en_disputa',
  'rejecting the proposal moves the contract to en_disputa'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000002');
select throws_ok(
  $$
    select public.reject_proposal(
      '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000002',
      'Intentando rechazar la misma propuesta una segunda vez, lo cual ya no debería ser posible en este estado.'
    )
  $$,
  'P0001',
  null,
  'a proposal that is no longer pendiente cannot be rejected again'
);
reset role;

insert into public.proposals (dispute_id, created_by, total_amount, supersedes_proposal_id)
  values ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000002', 10000, '00000000-0000-0000-0000-0000000000f1');

select pg_temp.login_as('00000000-0000-0000-0000-000000000002'); -- tenant, but this is now THEIR own pending proposal
select throws_ok(
  $$
    select public.reject_proposal(
      (select id from public.proposals where dispute_id = '00000000-0000-0000-0000-0000000000d2' and status = 'pendiente'),
      '00000000-0000-0000-0000-000000000002',
      'Tratando de rechazar mi propia contrapropuesta, algo que la función debería impedir explícitamente.'
    )
  $$,
  'P0001',
  null,
  'a user cannot reject their own pending proposal'
);
reset role;

-- ---------------------------------------------------------------------
-- Permissions matrix: only arrendador can propose (open a dispute);
-- only platform admin can resolve an escalated dispute directly.
-- ---------------------------------------------------------------------
insert into public.contracts (
  id, property_id, start_date, end_date, rent_amount, rent_currency, guarantee_currency, guarantee_amount
) values (
  '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b1',
  '2026-03-01', '2027-03-01', 300000, 'CLP', 'CLP', 300000
);
insert into public.contract_parties (contract_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000001', 'arrendador'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000002', 'arrendatario');

select pg_temp.login_as('00000000-0000-0000-0000-000000000001');
select public.sign_contract_landlord('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000001');
reset role;
select pg_temp.login_as('00000000-0000-0000-0000-000000000002');
select public.sign_contract_tenant('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000002');
select public.pay_guarantee(
  (select id from public.guarantees where contract_id = '00000000-0000-0000-0000-0000000000c3'),
  '00000000-0000-0000-0000-000000000002'
);

select throws_ok(
  $$
    insert into public.disputes (guarantee_id, opened_by)
    select g.id, '00000000-0000-0000-0000-000000000002'
    from public.guarantees g where g.contract_id = '00000000-0000-0000-0000-0000000000c3'
  $$,
  '42501',
  null,
  'the tenant can no longer open a dispute — only the landlord can propose descuentos'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000001');
select lives_ok(
  $$
    insert into public.disputes (id, guarantee_id, opened_by)
    select '00000000-0000-0000-0000-0000000000d3', g.id, '00000000-0000-0000-0000-000000000001'
    from public.guarantees g where g.contract_id = '00000000-0000-0000-0000-0000000000c3'
  $$,
  'the landlord can still open a dispute (propose descuentos)'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000001'); -- landlord, not admin
select throws_ok(
  $$ select public.resolve_dispute_admin('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000001', 50000, 'test') $$,
  'P0001',
  null,
  'a non-platform-admin cannot resolve a dispute'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000006'); -- platform admin
select throws_ok(
  $$ select public.resolve_dispute_admin('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000006', 10000, null) $$,
  'P0001',
  null,
  'a dispute that is not escalada cannot be resolved by admin'
);

select lives_ok(
  $$
    select public.resolve_dispute_admin(
      '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000006', 30000,
      'Evidencia insuficiente para justificar el monto propuesto, se retienen 30000'
    )
  $$,
  'a platform admin can resolve an escalated dispute directly'
);
reset role;

select is(
  (select status::text from public.disputes where id = '00000000-0000-0000-0000-0000000000d2'),
  'liquidada',
  'admin resolution marks the escalated dispute liquidada'
);

select is(
  (select status::text from public.contracts where id = '00000000-0000-0000-0000-0000000000c1'),
  'finalizado',
  'admin resolution finalizes the contract'
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
