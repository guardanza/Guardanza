-- pgTAP suite for the role-change-request feature (solicitudes_cambio_rol,
-- ejecutar_cambio_rol, resolver_solicitud_rol, cambiar_rol_admin_directo)
-- plus the two Fase 0 prerequisites (corredor freeze in create_contract,
-- the create_organization self-service gate). Same impersonation pattern
-- as rls.test.sql — separate file/transaction, own UUID range.

begin;
select plan(25);

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000101', 'admin@test.local'),
  ('00000000-0000-0000-0000-000000000102', 'landlord-freeze@test.local'),
  ('00000000-0000-0000-0000-000000000103', 'broker-admin@test.local'),
  ('00000000-0000-0000-0000-000000000104', 'pure-tenant@test.local'),
  ('00000000-0000-0000-0000-000000000105', 'downgrade-landlord@test.local'),
  ('00000000-0000-0000-0000-000000000106', 'blocked-landlord@test.local'),
  ('00000000-0000-0000-0000-000000000107', 'unrelated-landlord@test.local');

update public.profiles set full_name = 'Admin', is_platform_admin = true where id = '00000000-0000-0000-0000-000000000101';
update public.profiles set full_name = 'Landlord Freeze' where id = '00000000-0000-0000-0000-000000000102';
update public.profiles set full_name = 'Broker Admin' where id = '00000000-0000-0000-0000-000000000103';
update public.profiles set full_name = 'Pure Tenant' where id = '00000000-0000-0000-0000-000000000104';
update public.profiles set full_name = 'Downgrade Landlord' where id = '00000000-0000-0000-0000-000000000105';
update public.profiles set full_name = 'Blocked Landlord' where id = '00000000-0000-0000-0000-000000000106';
update public.profiles set full_name = 'Unrelated Landlord' where id = '00000000-0000-0000-0000-000000000107';

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000101a1', 'individual', 'Landlord Freeze Org', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-0000000101a2', 'broker', 'Broker Org', '00000000-0000-0000-0000-000000000103'),
  ('00000000-0000-0000-0000-0000000101a3', 'individual', 'Downgrade Org (empty)', '00000000-0000-0000-0000-000000000105'),
  ('00000000-0000-0000-0000-0000000101a4', 'individual', 'Blocked Org (has property)', '00000000-0000-0000-0000-000000000106'),
  ('00000000-0000-0000-0000-0000000101a5', 'individual', 'Unrelated Org', '00000000-0000-0000-0000-000000000107');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-0000000101a1', 'admin'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-0000000101a2', 'admin'),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-0000000101a3', 'admin'),
  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-0000000101a4', 'admin'),
  ('00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-0000000101a5', 'admin');

-- Freeze-org's property is delegated to Broker Org — create_contract should
-- snapshot Broker Admin into contract_parties as corredor.
insert into public.properties (id, organization_id, broker_organization_id, address) values
  ('00000000-0000-0000-0000-0000000101b1', '00000000-0000-0000-0000-0000000101a1', '00000000-0000-0000-0000-0000000101a2', 'Freeze St 1');

-- Blocked Org has a property with no broker — just needs to exist so the
-- downgrade-blocked check has something to find.
insert into public.properties (id, organization_id, address) values
  ('00000000-0000-0000-0000-0000000101b2', '00000000-0000-0000-0000-0000000101a4', 'Blocked Ave 1');

create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- A) create_contract freezes the broker org's current member as corredor
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000102'); -- landlord-freeze, admin of the property's org
select (public.create_contract(
  '00000000-0000-0000-0000-0000000101b1', '2026-01-01', '2027-01-01', 500000, 'CLP', 'CLP', 500000,
  '00000000-0000-0000-0000-000000000102'
)).id as new_contract_id \gset
reset role;

select is(
  (
    select count(*)::int from public.contract_parties
    where contract_id = :'new_contract_id' and user_id = '00000000-0000-0000-0000-000000000103' and role = 'corredor'
  ),
  1,
  'create_contract freezes the delegated broker org''s current member as corredor'
);

-- ---------------------------------------------------------------------
-- B) create_organization gate: zero-membership user blocked, existing
--    org-admin can still self-serve an additional one
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000104'); -- pure tenant, zero memberships
select throws_ok(
  $$select public.create_organization('individual', 'Sneaky Org', '00000000-0000-0000-0000-000000000104')$$,
  'P0001', null,
  'create_organization refuses a first org from a zero-membership, non-admin user'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000102'); -- already admins Landlord Freeze Org
select isnt(
  (select (public.create_organization('individual', 'Second Org', '00000000-0000-0000-0000-000000000102')).id),
  null,
  'create_organization still allows an existing org-admin to self-serve an additional organization'
);
reset role;

-- ---------------------------------------------------------------------
-- C) can_view_audit_entry: profile_role_change visible to the affected
--    user and to admins, not to unrelated users
-- ---------------------------------------------------------------------
insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
values (
  '00000000-0000-0000-0000-000000000101', 'profile_role_change.directo', 'profile_role_change',
  '00000000-0000-0000-0000-000000000104', '{}'::jsonb
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000104'); -- the affected user themselves
select is(
  (select count(*)::int from public.audit_log where entity_type = 'profile_role_change' and entity_id = '00000000-0000-0000-0000-000000000104'),
  1,
  'the affected user can see their own profile_role_change audit_log entry'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000107'); -- unrelated user
select is(
  (select count(*)::int from public.audit_log where entity_type = 'profile_role_change' and entity_id = '00000000-0000-0000-0000-000000000104'),
  0,
  'an unrelated user cannot see someone else''s profile_role_change audit_log entry'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000101'); -- admin
select is(
  (select count(*)::int from public.audit_log where entity_type = 'profile_role_change' and entity_id = '00000000-0000-0000-0000-000000000104'),
  1,
  'a platform admin can see any profile_role_change audit_log entry'
);
reset role;

-- ---------------------------------------------------------------------
-- D) solicitar_cambio_rol: admins can't request, duplicate pending blocked
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000101');
select throws_ok(
  $$select public.solicitar_cambio_rol('arrendador', 'Administrador de plataforma', null)$$,
  'P0001', null,
  'a platform admin cannot call solicitar_cambio_rol'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000104'); -- pure tenant
select (public.solicitar_cambio_rol('arrendador', 'Arrendatario(a)', 'quiero ser arrendador')).id as solicitud_id \gset
reset role;

select is(
  (select estado from public.solicitudes_cambio_rol where id = :'solicitud_id'::uuid),
  'pendiente',
  'solicitar_cambio_rol creates a pendiente request'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000104');
select throws_ok(
  $$select public.solicitar_cambio_rol('corredor', 'Arrendatario(a)', null)$$,
  'P0001', null,
  'a second request while one is still pendiente is blocked'
);
reset role;

-- ---------------------------------------------------------------------
-- E) RLS on solicitudes_cambio_rol: own row, admin sees all, others don't
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000104');
select is(
  (select count(*)::int from public.solicitudes_cambio_rol where user_id = '00000000-0000-0000-0000-000000000104'),
  1,
  'a user can see their own solicitud_cambio_rol row'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000107');
select is(
  (select count(*)::int from public.solicitudes_cambio_rol where user_id = '00000000-0000-0000-0000-000000000104'),
  0,
  'an unrelated user cannot see someone else''s solicitud_cambio_rol row'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000101');
select is(
  (select count(*)::int from public.solicitudes_cambio_rol where user_id = '00000000-0000-0000-0000-000000000104'),
  1,
  'a platform admin can see any solicitud_cambio_rol row'
);
reset role;

-- ---------------------------------------------------------------------
-- F) resolver_solicitud_rol: non-admin blocked, admin approval executes
--    the change and audits it
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000102'); -- non-admin
select throws_ok(
  format($$select public.resolver_solicitud_rol('%s'::uuid, true)$$, :'solicitud_id'),
  'P0001', null,
  'a non-admin cannot call resolver_solicitud_rol'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000101'); -- admin
select public.resolver_solicitud_rol(:'solicitud_id'::uuid, true, null, 'Pure Tenant Landlord Org', null, null);
reset role;

select is(
  (select estado from public.solicitudes_cambio_rol where id = :'solicitud_id'::uuid),
  'aprobada',
  'resolver_solicitud_rol marks the request aprobada'
);

select is(
  (
    select count(*)::int from public.memberships m
    join public.organizations o on o.id = m.organization_id
    where m.user_id = '00000000-0000-0000-0000-000000000104' and m.role = 'admin' and o.type = 'individual'
  ),
  1,
  'approving an arrendador request creates the organization + admin membership'
);

select is(
  (
    select count(*)::int from public.audit_log
    where entity_type = 'profile_role_change' and entity_id = '00000000-0000-0000-0000-000000000104'
      and action = 'solicitud_cambio_rol.aprobada'
  ),
  1,
  'approving a request writes a solicitud_cambio_rol.aprobada audit_log entry'
);

-- ---------------------------------------------------------------------
-- G) ejecutar_cambio_rol: downgrade blocked when the org has properties,
--    allowed when it doesn't
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000101');
select throws_ok(
  $$select public.ejecutar_cambio_rol('00000000-0000-0000-0000-000000000106', 'arrendatario')$$,
  'P0001', null,
  'downgrading to arrendatario is blocked when the org has properties'
);
reset role;

select is(
  (select count(*)::int from public.memberships where user_id = '00000000-0000-0000-0000-000000000106' and role = 'admin'),
  1,
  'a blocked downgrade attempt leaves the membership untouched'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000101');
select lives_ok(
  $$select public.ejecutar_cambio_rol('00000000-0000-0000-0000-000000000105', 'arrendatario')$$,
  'downgrading to arrendatario succeeds when the org has zero properties'
);
reset role;

select is(
  (select count(*)::int from public.memberships where user_id = '00000000-0000-0000-0000-000000000105' and role = 'admin'),
  0,
  'a successful downgrade removes the admin membership'
);

-- ---------------------------------------------------------------------
-- H) cambiar_rol_admin_directo: non-admin blocked, admin change audited
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000102'); -- non-admin
select throws_ok(
  $$select public.cambiar_rol_admin_directo('00000000-0000-0000-0000-000000000105', 'arrendador', null, 'Directo Org', null, null)$$,
  'P0001', null,
  'a non-admin cannot call cambiar_rol_admin_directo'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000101');
select lives_ok(
  $$select public.cambiar_rol_admin_directo('00000000-0000-0000-0000-000000000105', 'arrendador', 'reactivado', 'Directo Org', null, null)$$,
  'admin can change a role directly (downgrade-landlord now has zero orgs, needs a new one)'
);
reset role;

select is(
  (
    select count(*)::int from public.audit_log
    where entity_type = 'profile_role_change' and entity_id = '00000000-0000-0000-0000-000000000105'
      and action = 'profile_role_change.directo'
  ),
  1,
  'cambiar_rol_admin_directo writes a profile_role_change.directo audit_log entry'
);

-- ---------------------------------------------------------------------
-- I) profiles: platform admin gets global read, other users still don't
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000101');
select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-000000000104'),
  1,
  'a platform admin can read an arbitrary user''s profile'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000107'); -- unrelated, no shared contract/org
select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-000000000104'),
  0,
  'a non-admin still cannot read an unrelated user''s profile'
);
reset role;

select * from finish();
rollback;
