-- pgTAP suite for Tanda B Paso 1: the contact book (public.contacts) data
-- model and RLS. Same impersonation pattern as the other suites, own UUID
-- range (...000301-...000305, ...0000003a1/...0000003a2).

begin;
select plan(17);

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000301', 'contacts-org1-admin@test.local'),
  ('00000000-0000-0000-0000-000000000302', 'contacts-org1-member@test.local'),
  ('00000000-0000-0000-0000-000000000303', 'contacts-org2-admin@test.local'),
  ('00000000-0000-0000-0000-000000000304', 'contacts-platform-admin@test.local'),
  ('00000000-0000-0000-0000-000000000305', 'contacts-outsider@test.local');

update public.profiles set is_platform_admin = true where id = '00000000-0000-0000-0000-000000000304';

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000003a1', 'individual', 'Contacts Org 1', '00000000-0000-0000-0000-000000000301'),
  ('00000000-0000-0000-0000-0000000003a2', 'individual', 'Contacts Org 2', '00000000-0000-0000-0000-000000000303');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-0000000003a1', 'admin'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-0000000003a1', 'agente'),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-0000000003a2', 'admin');

create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- Insert: only the owning org's admin can load a contact into its libreta
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000301'); -- org1 admin
select lives_ok(
  $$ insert into public.contacts (organization_id, contact_role, full_name, email, rut, created_by) values
     ('00000000-0000-0000-0000-0000000003a1', 'arrendatario', 'Primer Contacto', 'primer.contacto@test.local', '11111111-1', '00000000-0000-0000-0000-000000000301') $$,
  'the owning org''s admin can load a new contact'
);
reset role;

select is(
  (select status from public.contacts where email = 'primer.contacto@test.local'),
  'pendiente',
  'a freshly loaded contact defaults to pendiente'
);
select is(
  (select user_id from public.contacts where email = 'primer.contacto@test.local'),
  null::uuid,
  'a freshly loaded contact has no user_id linked yet'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000301');
select throws_ok(
  $$ insert into public.contacts (organization_id, contact_role, full_name, email, created_by) values
     ('00000000-0000-0000-0000-0000000003a1', 'arrendatario', 'Duplicado', 'primer.contacto@test.local', '00000000-0000-0000-0000-000000000301') $$,
  '23505',
  null,
  'the same org cannot load two contacts with the same email'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000302'); -- org1 non-admin member
select throws_ok(
  $$ insert into public.contacts (organization_id, contact_role, full_name, email, created_by) values
     ('00000000-0000-0000-0000-0000000003a1', 'arrendatario', 'Otro', 'otro@test.local', '00000000-0000-0000-0000-000000000302') $$,
  '42501',
  null,
  'a non-admin member of the org cannot load a contact'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000301'); -- org1 admin, spoofing created_by
select throws_ok(
  $$ insert into public.contacts (organization_id, contact_role, full_name, email, created_by) values
     ('00000000-0000-0000-0000-0000000003a1', 'arrendatario', 'Spoof', 'spoof@test.local', '00000000-0000-0000-0000-000000000302') $$,
  '42501',
  null,
  'created_by cannot be spoofed to a different user'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000303'); -- org2 admin, wrong org
select throws_ok(
  $$ insert into public.contacts (organization_id, contact_role, full_name, email, created_by) values
     ('00000000-0000-0000-0000-0000000003a1', 'arrendatario', 'Ajeno', 'ajeno@test.local', '00000000-0000-0000-0000-000000000303') $$,
  '42501',
  null,
  'an admin of a different org cannot load a contact into someone else''s libreta'
);
reset role;

-- ---------------------------------------------------------------------
-- Select: any org member can see the libreta; outsiders and other orgs cannot
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000302'); -- org1 non-admin member
select is(
  (select count(*)::int from public.contacts where organization_id = '00000000-0000-0000-0000-0000000003a1'),
  1,
  'a non-admin member of the org can still see its libreta'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000303'); -- org2 admin, unrelated
select is_empty(
  $$ select 1 from public.contacts where organization_id = '00000000-0000-0000-0000-0000000003a1' $$,
  'an admin of an unrelated org cannot see another org''s libreta'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000305'); -- outsider, no membership anywhere
select is_empty(
  $$ select 1 from public.contacts where organization_id = '00000000-0000-0000-0000-0000000003a1' $$,
  'a complete outsider cannot see any libreta'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000304'); -- platform admin
select is(
  (select count(*)::int from public.contacts where organization_id = '00000000-0000-0000-0000-0000000003a1'),
  1,
  'a platform admin can see any libreta'
);
reset role;

-- ---------------------------------------------------------------------
-- Delete: only the owning org's admin can remove a contact
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000305'); -- outsider
select lives_ok(
  $$ delete from public.contacts where email = 'primer.contacto@test.local' $$,
  'an outsider''s delete attempt does not error (RLS filters it out of the WHERE, not a hard denial)'
);
reset role;

select is(
  (select count(*)::int from public.contacts where email = 'primer.contacto@test.local'),
  1,
  'but the row is untouched — an outsider''s delete silently affects zero rows'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000302'); -- org1 non-admin member
select lives_ok(
  $$ delete from public.contacts where email = 'primer.contacto@test.local' $$,
  'a non-admin member''s delete attempt does not error either'
);
reset role;

select is(
  (select count(*)::int from public.contacts where email = 'primer.contacto@test.local'),
  1,
  'and it also silently affects zero rows — only the org admin can actually delete'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000301'); -- org1 admin
select lives_ok(
  $$ delete from public.contacts where email = 'primer.contacto@test.local' $$,
  'the owning org''s admin can remove a contact'
);
reset role;

select is(
  (select count(*)::int from public.contacts where email = 'primer.contacto@test.local'),
  0,
  'the contact is actually gone after the admin deletes it'
);

select * from finish();
rollback;
