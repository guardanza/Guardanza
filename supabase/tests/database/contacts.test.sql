-- pgTAP suite for Tanda B Paso 1/3: the contact book (public.contacts)
-- data model, RLS, and load_contact()'s three email paths. Same
-- impersonation pattern as the other suites, own UUID range
-- (...000301-...000305, ...000311-...000313, ...0000003a1-...0000003b1).

begin;
select plan(75);

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

-- ---------------------------------------------------------------------
-- issue_contact_invite() — Paso 4: token propio, hasheado, emitir y
-- reenviar son la misma operación.
-- ---------------------------------------------------------------------
-- now() is frozen for the whole test transaction, so two calls to
-- issue_contact_invite() below would get identical expires_at — an
-- explicit ordering column (not expires_at) is what actually
-- distinguishes "old" from "new" token.
create temporary table invite_capture (seq serial primary key, raw_token text, expires_at timestamptz);
grant insert, select on invite_capture to authenticated;
grant usage on sequence invite_capture_seq_seq to authenticated;

-- camino1@test.local quedó pendiente en la sección de load_contact() más
-- arriba en este mismo archivo — la reusamos acá.
select pg_temp.login_as('00000000-0000-0000-0000-000000000301'); -- org1 admin
insert into invite_capture (raw_token, expires_at)
  select raw_token, expires_at from public.issue_contact_invite(
    (select id from public.contacts where email = 'camino1@test.local')
  );
reset role;

select isnt(
  (select raw_token from invite_capture),
  null,
  'issue_contact_invite: devuelve un token crudo'
);
select is(
  (select invite_token_hash from public.contacts where email = 'camino1@test.local'),
  (select extensions.digest((select raw_token from invite_capture), 'sha256')),
  'issue_contact_invite: guarda el hash sha256 del token, no el token en sí'
);
select isnt(
  (select invited_at from public.contacts where email = 'camino1@test.local'),
  null,
  'issue_contact_invite: deja invited_at asentado'
);
select cmp_ok(
  (select expires_at from invite_capture),
  '>',
  now() + interval '6 days 23 hours',
  'issue_contact_invite: expira a ~7 días, no antes'
);
select cmp_ok(
  (select expires_at from invite_capture),
  '<',
  now() + interval '7 days 1 hour',
  'issue_contact_invite: expira a ~7 días, no después'
);

-- Autorización: mismo criterio que load_contact — solo el admin de la
-- organización dueña puede invitar (o reenviar) para esa ficha.
select pg_temp.login_as('00000000-0000-0000-0000-000000000302'); -- org1 non-admin member
select throws_ok(
  $$ select public.issue_contact_invite(
       (select id from public.contacts where email = 'camino1@test.local')
     ) $$,
  'P0001',
  null,
  'issue_contact_invite: un miembro no-admin no puede invitar'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000303'); -- org2 admin, unrelated
select throws_ok(
  $$ select public.issue_contact_invite(
       (select id from public.contacts where email = 'camino1@test.local')
     ) $$,
  'P0001',
  null,
  'issue_contact_invite: el admin de una organización ajena no puede invitar'
);
reset role;

-- Una ficha ya confirmada (vínculo directo, camino 2) nunca necesitó
-- invitación — no se puede invitar.
select pg_temp.login_as('00000000-0000-0000-0000-000000000301');
select throws_ok(
  $$ select public.issue_contact_invite(
       (select id from public.contacts where email = 'camino2@test.local')
     ) $$,
  'P0001',
  null,
  'issue_contact_invite: una ficha ya confirmada no se puede invitar'
);
select throws_ok(
  $$ select public.issue_contact_invite('00000000-0000-0000-0000-000000009999') $$,
  'P0001',
  null,
  'issue_contact_invite: una ficha inexistente lanza error'
);
reset role;

-- Reenviar: mismo contacto, token nuevo, el viejo deja de matchear.
-- now() está congelado durante toda esta transacción de test, así que sin
-- retroceder invited_at manualmente el cooldown de abajo (60s) rechazaría
-- este segundo llamado — se prueba el cooldown por separado, con su
-- propia ficha, más abajo.
update public.contacts set invited_at = now() - interval '2 minutes' where email = 'camino1@test.local';

select pg_temp.login_as('00000000-0000-0000-0000-000000000301');
insert into invite_capture (raw_token, expires_at)
  select raw_token, expires_at from public.issue_contact_invite(
    (select id from public.contacts where email = 'camino1@test.local')
  );
reset role;

select is(
  (select count(distinct raw_token)::int from invite_capture),
  2,
  'issue_contact_invite: reenviar genera un token distinto del anterior'
);
select is(
  (select count(*)::int from public.contacts where email = 'camino1@test.local'),
  1,
  'issue_contact_invite: reenviar no duplica la ficha'
);
select is(
  (
    select invite_token_hash from public.contacts where email = 'camino1@test.local'
  ),
  (
    select extensions.digest((select raw_token from invite_capture order by seq desc limit 1), 'sha256')
  ),
  'issue_contact_invite: el hash guardado corresponde al token nuevo'
);
select is(
  (
    select count(*)::int from public.contacts
    where email = 'camino1@test.local'
      and invite_token_hash = extensions.digest((select raw_token from invite_capture order by seq asc limit 1), 'sha256')
  ),
  0,
  'issue_contact_invite: el token viejo ya no matchea nada tras reenviar'
);

-- ---------------------------------------------------------------------
-- Anti-spam: no se puede reemitir/reenviar más de una vez por minuto.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000301'); -- org1 admin
insert into public.contacts (organization_id, contact_role, full_name, email, created_by) values
  ('00000000-0000-0000-0000-0000000003a1', 'arrendatario', 'Cooldown Test', 'cooldown@test.local', '00000000-0000-0000-0000-000000000301');
select lives_ok(
  $$ select public.issue_contact_invite((select id from public.contacts where email = 'cooldown@test.local')) $$,
  'issue_contact_invite: la primera emisión no choca con ningún cooldown'
);
select throws_ok(
  $$ select public.issue_contact_invite((select id from public.contacts where email = 'cooldown@test.local')) $$,
  'P0001',
  null,
  'issue_contact_invite: reenviar antes de 60s se rechaza (anti-spam)'
);
reset role;

-- ---------------------------------------------------------------------
-- Reenvío a alguien que se registró mientras tanto ("Opción A"): se
-- vincula directo si el rol coincide, se rechaza igual que el camino 3
-- si no coincide — la regla una-cuenta-un-rol no tiene puerta lateral acá.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000301'); -- org1 admin
select is(
  (select c.status from public.load_contact(
    '00000000-0000-0000-0000-0000000003a1', 'arrendatario', 'Registrado Mientras Tanto', 'registrado-mientras-tanto@test.local', null, null
  ) c),
  'pendiente',
  'fixture: ficha pendiente para probar el reenvío-con-vínculo-directo'
);

select is(
  (
    select linked from public.issue_contact_invite(
      (select id from public.contacts where email = 'registrado-mientras-tanto@test.local'),
      '00000000-0000-0000-0000-000000000311' -- ya tiene rol_declarado = arrendatario, mismo rol pedido
    )
  ),
  true,
  'issue_contact_invite: reenviar a alguien que ya se registró con el MISMO rol vincula directo'
);
select is(
  (select status from public.contacts where email = 'registrado-mientras-tanto@test.local'),
  'confirmado',
  'issue_contact_invite: el vínculo directo por reenvío deja la ficha confirmada'
);
select is(
  (select user_id from public.contacts where email = 'registrado-mientras-tanto@test.local'),
  '00000000-0000-0000-0000-000000000311'::uuid,
  'issue_contact_invite: el vínculo directo por reenvío deja el user_id correcto'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000301');
select is(
  (select c.status from public.load_contact(
    '00000000-0000-0000-0000-0000000003a1', 'arrendatario', 'Registrado Con Otro Rol', 'registrado-otro-rol@test.local', null, null
  ) c),
  'pendiente',
  'fixture: otra ficha pendiente, esta vez para probar el rechazo por rol distinto'
);
select throws_ok(
  $$ select public.issue_contact_invite(
       (select id from public.contacts where email = 'registrado-otro-rol@test.local'),
       '00000000-0000-0000-0000-000000000312' -- corredor real, se pidió arrendatario
     ) $$,
  'P0001',
  null,
  'issue_contact_invite: reenviar a alguien que se registró con OTRO rol se rechaza, igual que el camino 3'
);
reset role;

select is(
  (select status from public.contacts where email = 'registrado-otro-rol@test.local'),
  'pendiente',
  'issue_contact_invite: el rechazo por rol distinto no cambia el estado de la ficha'
);

-- ---------------------------------------------------------------------
-- resolve_contact_invite() / confirm_contact_invite() — Paso 5.
-- ---------------------------------------------------------------------
create temporary table confirm_invite_capture (label text primary key, raw_token text, expires_at timestamptz);
grant select, insert on confirm_invite_capture to authenticated, anon, service_role;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000321', 'confirm-target-fresh@test.local'),
  ('00000000-0000-0000-0000-000000000322', 'confirm-target-samerole@test.local'),
  ('00000000-0000-0000-0000-000000000323', 'confirm-target-otherrole@test.local');
update public.profiles set rol_declarado = 'arrendatario' where id = '00000000-0000-0000-0000-000000000322';
insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000003c1', 'broker', 'Confirm Target Broker', '00000000-0000-0000-0000-000000000323');
insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000000323', '00000000-0000-0000-0000-0000000003c1', 'admin');

select pg_temp.login_as('00000000-0000-0000-0000-000000000301'); -- org1 admin
select public.load_contact(
  '00000000-0000-0000-0000-0000000003a1', 'arrendatario', 'Confirm Fresh', 'confirm-fresh@test.local', null, null
);
insert into confirm_invite_capture (label, raw_token, expires_at)
  select 'fresh', raw_token, expires_at from public.issue_contact_invite(
    (select id from public.contacts where email = 'confirm-fresh@test.local')
  );

select public.load_contact(
  '00000000-0000-0000-0000-0000000003a1', 'arrendatario', 'Confirm Samerole', 'confirm-samerole@test.local', null, null
);
insert into confirm_invite_capture (label, raw_token, expires_at)
  select 'samerole', raw_token, expires_at from public.issue_contact_invite(
    (select id from public.contacts where email = 'confirm-samerole@test.local')
  );

select public.load_contact(
  '00000000-0000-0000-0000-0000000003a1', 'arrendatario', 'Confirm Mismatch', 'confirm-mismatch@test.local', null, null
);
insert into confirm_invite_capture (label, raw_token, expires_at)
  select 'mismatch', raw_token, expires_at from public.issue_contact_invite(
    (select id from public.contacts where email = 'confirm-mismatch@test.local')
  );

select public.load_contact(
  '00000000-0000-0000-0000-0000000003a1', 'arrendador', 'Confirm PlatAdmin', 'confirm-platadmin@test.local', null, null
);
insert into confirm_invite_capture (label, raw_token, expires_at)
  select 'platadmin', raw_token, expires_at from public.issue_contact_invite(
    (select id from public.contacts where email = 'confirm-platadmin@test.local')
  );
reset role;

-- resolve_contact_invite: token inválido no devuelve nada, no revienta.
select is_empty(
  $$ select 1 from public.resolve_contact_invite('token-que-no-existe') $$,
  'resolve_contact_invite: un token inexistente no devuelve filas'
);
-- Callable por anon — es lo único que hace posible que /invite/[token]
-- funcione para alguien sin ninguna sesión de Supabase todavía.
set local role anon;
select is(
  (select full_name from public.resolve_contact_invite((select raw_token from confirm_invite_capture where label = 'fresh'))),
  'Confirm Fresh',
  'resolve_contact_invite: invocable por anon con el token correcto'
);
reset role;

set local role authenticated;
select is(
  (select organization_name from public.resolve_contact_invite((select raw_token from confirm_invite_capture where label = 'fresh'))),
  'Contacts Org 1',
  'resolve_contact_invite: devuelve el nombre de la organización que invitó'
);
reset role;

-- confirm_contact_invite: caso feliz, cuenta sin rol declarado todavía.
set local role service_role;
select is(
  (
    select (r.contact).status from public.confirm_contact_invite(
      (select raw_token from confirm_invite_capture where label = 'fresh'),
      '00000000-0000-0000-0000-000000000321'
    ) r
  ),
  'confirmado',
  'confirm_contact_invite: caso feliz deja la ficha confirmada'
);
reset role;

select is(
  (select rol_declarado from public.profiles where id = '00000000-0000-0000-0000-000000000321'),
  'arrendatario',
  'confirm_contact_invite: consolida rol_declarado en la cuenta recién creada'
);
select is(
  (select user_id from public.contacts where email = 'confirm-fresh@test.local'),
  '00000000-0000-0000-0000-000000000321'::uuid,
  'confirm_contact_invite: deja el user_id vinculado'
);
select is(
  (select invite_token_hash from public.contacts where email = 'confirm-fresh@test.local'),
  null,
  'confirm_contact_invite: limpia el hash del token — de un solo uso'
);
select is(
  (select count(*)::int from public.audit_log where action = 'contact.confirmed' and entity_id = (
    select id from public.contacts where email = 'confirm-fresh@test.local'
  )),
  1,
  'confirm_contact_invite: deja registro en audit_log'
);

-- Token ya usado: la ficha ya no está pendiente, el mismo token no vuelve
-- a matchear — de un solo uso, aunque alguien reuse el link. Esto SÍ
-- sigue lanzando excepción (token inválido/vencido no tiene ninguna fila
-- de contacts que marcar, a diferencia del rechazo por rol).
set local role service_role;
select throws_ok(
  $$ select public.confirm_contact_invite(
       (select raw_token from confirm_invite_capture where label = 'fresh'),
       '00000000-0000-0000-0000-000000000321'
     ) $$,
  'P0001',
  null,
  'confirm_contact_invite: un token ya usado no vuelve a funcionar'
);
select throws_ok(
  $$ select public.confirm_contact_invite('token-que-no-existe', '00000000-0000-0000-0000-000000000321') $$,
  'P0001',
  null,
  'confirm_contact_invite: un token inexistente lanza error'
);
reset role;

-- Cuenta que ya tenía el MISMO rol declarado (se registró de forma
-- independiente, o ya venía de otra libreta) — se confirma igual.
set local role service_role;
select is(
  (
    select (r.contact).status from public.confirm_contact_invite(
      (select raw_token from confirm_invite_capture where label = 'samerole'),
      '00000000-0000-0000-0000-000000000322'
    ) r
  ),
  'confirmado',
  'confirm_contact_invite: una cuenta con el mismo rol declarado se confirma igual'
);
reset role;

-- Rol distinto: NO lanza excepción (a propósito — ver comentario en la
-- migración) — devuelve ok = false, y la marca de role_conflict_at
-- sobrevive porque no hubo ningún raise que la revirtiera.
set local role service_role;
select is(
  (
    select r.ok from public.confirm_contact_invite(
      (select raw_token from confirm_invite_capture where label = 'mismatch'),
      '00000000-0000-0000-0000-000000000323' -- corredor real, se pidió arrendatario
    ) r
  ),
  false,
  'confirm_contact_invite: rol distinto se rechaza (ok = false), igual que el camino 3'
);
reset role;

select is(
  (select status from public.contacts where email = 'confirm-mismatch@test.local'),
  'pendiente',
  'confirm_contact_invite: el rechazo no confirma la ficha'
);
select isnt(
  (select role_conflict_at from public.contacts where email = 'confirm-mismatch@test.local'),
  null,
  'confirm_contact_invite: deja role_conflict_at marcado para que /contacts lo muestre'
);

-- Cuenta de platform admin: nunca confirmable, sea cual sea el rol pedido.
set local role service_role;
select is(
  (
    select r.ok from public.confirm_contact_invite(
      (select raw_token from confirm_invite_capture where label = 'platadmin'),
      '00000000-0000-0000-0000-000000000304'
    ) r
  ),
  false,
  'confirm_contact_invite: una cuenta de platform admin nunca se puede confirmar (ok = false)'
);
reset role;

-- Reenviar limpia role_conflict_at — un intento nuevo parte de cero.
update public.contacts set invited_at = now() - interval '2 minutes' where email = 'confirm-mismatch@test.local';
select pg_temp.login_as('00000000-0000-0000-0000-000000000301');
select public.issue_contact_invite((select id from public.contacts where email = 'confirm-mismatch@test.local'));
reset role;
select is(
  (select role_conflict_at from public.contacts where email = 'confirm-mismatch@test.local'),
  null,
  'issue_contact_invite: reenviar limpia role_conflict_at, es un intento fresco'
);

-- ---------------------------------------------------------------------
-- reject_contact_invite() — Parte 3: rechazo explícito, mismo token que
-- ya usa aceptar. La ficha NO se borra ni cambia de status — sigue
-- 'pendiente' con invite_rejected_at marcado (mismo patrón que
-- role_conflict_at), y el token queda invalidado — no se puede reusar
-- después, ni para rechazar de nuevo ni para aceptar.
-- ---------------------------------------------------------------------
create temporary table reject_invite_capture (label text primary key, raw_token text);
grant select, insert on reject_invite_capture to authenticated, anon, service_role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000301'); -- org1 admin
select public.load_contact(
  '00000000-0000-0000-0000-0000000003a1', 'arrendatario', 'Reject Fresh', 'reject-fresh@test.local', null, null
);
insert into reject_invite_capture (label, raw_token)
  select 'fresh', raw_token from public.issue_contact_invite(
    (select id from public.contacts where email = 'reject-fresh@test.local')
  );
reset role;

-- Token inválido: no revienta, devuelve ok = false — mismo criterio que
-- confirm_contact_invite ante un rol distinto: un resultado normal, no
-- un error de servidor.
set local role anon;
select is(
  (select ok from public.reject_contact_invite('token-que-no-existe')),
  false,
  'reject_contact_invite: un token inexistente devuelve ok = false, sin lanzar excepción'
);
reset role;

-- Callable por anon — es lo que hace posible rechazar desde /invite/[token]
-- sin ninguna sesión de Supabase.
set local role anon;
select is(
  (select ok from public.reject_contact_invite((select raw_token from reject_invite_capture where label = 'fresh'))),
  true,
  'reject_contact_invite: invocable por anon, caso feliz devuelve ok = true'
);
reset role;

select is(
  (select status from public.contacts where email = 'reject-fresh@test.local'),
  'pendiente',
  'reject_contact_invite: la ficha sigue pendiente, no se borra ni cambia de status'
);
select isnt(
  (select invite_rejected_at from public.contacts where email = 'reject-fresh@test.local'),
  null,
  'reject_contact_invite: deja invite_rejected_at marcado'
);
select is(
  (select invite_token_hash from public.contacts where email = 'reject-fresh@test.local'),
  null,
  'reject_contact_invite: invalida el token — no se puede reusar'
);
select is(
  (select count(*)::int from public.audit_log where action = 'contact.invite_rejected' and entity_id = (
    select id from public.contacts where email = 'reject-fresh@test.local'
  )),
  1,
  'reject_contact_invite: deja registro en audit_log'
);

-- El token ya rechazado no sirve para aceptar después — mismo motivo que
-- "de un solo uso" en confirm_contact_invite: el hash quedó en null, no
-- hay ninguna fila que matchee.
set local role service_role;
select throws_ok(
  $$ select public.confirm_contact_invite(
       (select raw_token from reject_invite_capture where label = 'fresh'),
       '00000000-0000-0000-0000-000000000321'
     ) $$,
  'P0001',
  null,
  'reject_contact_invite: el token rechazado ya no sirve para aceptar después'
);
reset role;

-- Rechazar dos veces el mismo token: la segunda vez ya no matchea nada
-- (quedó en null tras la primera), ok = false, sin reventar.
set local role anon;
select is(
  (select ok from public.reject_contact_invite((select raw_token from reject_invite_capture where label = 'fresh'))),
  false,
  'reject_contact_invite: rechazar el mismo token dos veces la segunda vez devuelve ok = false'
);
reset role;

-- Reenviar limpia invite_rejected_at — mismo criterio que ya prueba
-- role_conflict_at más arriba: un reenvío es un intento fresco de
-- verdad, sin arrastrar el rechazo anterior.
update public.contacts set invited_at = now() - interval '2 minutes' where email = 'reject-fresh@test.local';
select pg_temp.login_as('00000000-0000-0000-0000-000000000301');
select public.issue_contact_invite((select id from public.contacts where email = 'reject-fresh@test.local'));
reset role;
select is(
  (select invite_rejected_at from public.contacts where email = 'reject-fresh@test.local'),
  null,
  'issue_contact_invite: reenviar limpia invite_rejected_at, es un intento fresco'
);

select * from finish();
rollback;
