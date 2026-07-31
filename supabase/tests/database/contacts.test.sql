-- pgTAP suite for Tanda B Paso 1/3: the contact book (public.contacts)
-- data model, RLS, and load_contact()'s three email paths. Same
-- impersonation pattern as the other suites, own UUID range
-- (...000301-...000305, ...000311-...000313, ...0000003a1-...0000003b1).

begin;
select plan(28);

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

-- ---------------------------------------------------------------------
-- load_contact() — the three email paths (Paso 3)
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000311', 'contacts-target-arrendatario@test.local'),
  ('00000000-0000-0000-0000-000000000312', 'contacts-target-corredor@test.local'),
  ('00000000-0000-0000-0000-000000000313', 'contacts-target-no-role@test.local');

update public.profiles set rol_declarado = 'arrendatario' where id = '00000000-0000-0000-0000-000000000311';

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000003b1', 'broker', 'Contacts Target Broker', '00000000-0000-0000-0000-000000000312');
insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000000312', '00000000-0000-0000-0000-0000000003b1', 'admin');

-- Camino 1: el email no tiene cuenta (p_target_user_id = null, ya
-- resuelto por la capa TS antes de llamar a la función) — queda pendiente.
select pg_temp.login_as('00000000-0000-0000-0000-000000000301'); -- org1 admin
select is(
  (select c.status from public.load_contact(
    '00000000-0000-0000-0000-0000000003a1', 'arrendatario', 'Camino Uno', 'camino1@test.local', null, null
  ) c),
  'pendiente',
  'load_contact: camino 1 (sin cuenta) queda pendiente'
);
reset role;

-- Camino 2: el email ya existe con el MISMO rol esperado — vínculo
-- directo, confirmado de inmediato, sin invitación.
select pg_temp.login_as('00000000-0000-0000-0000-000000000301');
select is(
  (select c.status from public.load_contact(
    '00000000-0000-0000-0000-0000000003a1', 'arrendatario', 'Camino Dos', 'camino2@test.local', null,
    '00000000-0000-0000-0000-000000000311'
  ) c),
  'confirmado',
  'load_contact: camino 2 (mismo rol) queda confirmado de inmediato'
);
reset role;
select is(
  (select user_id from public.contacts where email = 'camino2@test.local'),
  '00000000-0000-0000-0000-000000000311'::uuid,
  'load_contact: camino 2 deja el user_id ya vinculado'
);
select isnt(
  (select confirmed_at from public.contacts where email = 'camino2@test.local'),
  null,
  'load_contact: camino 2 deja confirmed_at asentado'
);
select is(
  (select count(*)::int from public.audit_log where action = 'contact.linked' and entity_id = (
    select id from public.contacts where email = 'camino2@test.local'
  )),
  1,
  'load_contact: camino 2 deja registro en audit_log (sustituto de la notificación real hasta el Paso 4)'
);

-- Camino 3: el email ya existe con OTRO rol — rechazo.
select pg_temp.login_as('00000000-0000-0000-0000-000000000301');
select throws_ok(
  $$ select public.load_contact(
       '00000000-0000-0000-0000-0000000003a1', 'arrendatario', 'Camino Tres', 'camino3@test.local', null,
       '00000000-0000-0000-0000-000000000312'
     ) $$,
  'P0001',
  null,
  'load_contact: camino 3 (rol distinto — corredor vs. arrendatario pedido) se rechaza'
);
reset role;

-- Camino 3 (variante): una cuenta de plataforma nunca es cargable, sea
-- cual sea el rol pedido.
select pg_temp.login_as('00000000-0000-0000-0000-000000000301');
select throws_ok(
  $$ select public.load_contact(
       '00000000-0000-0000-0000-0000000003a1', 'arrendador', 'Admin Plataforma', 'admin-plat@test.local', null,
       '00000000-0000-0000-0000-000000000304'
     ) $$,
  'P0001',
  null,
  'load_contact: una cuenta de platform admin nunca se puede cargar como contacto'
);
reset role;

-- Cuenta existente sin ningún rol asentado todavía: nada con qué chocar,
-- se trata como camino 2 (confirmado de inmediato).
select pg_temp.login_as('00000000-0000-0000-0000-000000000301');
select is(
  (select c.status from public.load_contact(
    '00000000-0000-0000-0000-0000000003a1', 'corredor', 'Sin Rol Todavia', 'sin-rol@test.local', null,
    '00000000-0000-0000-0000-000000000313'
  ) c),
  'confirmado',
  'load_contact: una cuenta existente sin rol declarado todavía se trata como camino 2'
);
reset role;

-- Autorización: solo el admin de la organización dueña puede invocar
-- load_contact — mismo criterio que la RLS de insert, pero re-chequeado
-- adentro de la función porque security definer bypassea esa policy.
select pg_temp.login_as('00000000-0000-0000-0000-000000000302'); -- org1 non-admin member
select throws_ok(
  $$ select public.load_contact(
       '00000000-0000-0000-0000-0000000003a1', 'arrendatario', 'No Autorizado', 'no-autorizado@test.local', null, null
     ) $$,
  'P0001',
  null,
  'load_contact: un miembro no-admin no puede invocarla'
);
reset role;

-- El unique (organization_id, email) sigue aplicando pase lo que pase por
-- el camino que sea.
select pg_temp.login_as('00000000-0000-0000-0000-000000000301');
select throws_ok(
  $$ select public.load_contact(
       '00000000-0000-0000-0000-0000000003a1', 'arrendatario', 'Duplicado Otra Vez', 'camino1@test.local', null, null
     ) $$,
  '23505',
  null,
  'load_contact: el unique de (organization_id, email) sigue aplicando'
);
reset role;

-- contact_target_role() es de uso interno — ningún cliente autenticado
-- puede invocarla directo (sería un oráculo de "qué rol tiene la cuenta
-- X" para cualquier UUID).
select pg_temp.login_as('00000000-0000-0000-0000-000000000301');
select throws_ok(
  $$ select public.contact_target_role('00000000-0000-0000-0000-000000000311') $$,
  '42501',
  null,
  'contact_target_role: no es invocable directo por un cliente autenticado'
);
reset role;

select * from finish();
rollback;
