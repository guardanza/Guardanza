-- pgTAP suite para la migración 20260828100001: visibilidad de perfil
-- para contactos confirmados (por eso se ve la foto) y el lado inverso
-- de la relación (ensure_reciprocal_contact). Mismo patrón de
-- impersonación que el resto de las suites de RLS. Propio rango de UUID
-- (usuarios ...000980-...000985, orgs ...0000009d1-...0000009d2,
-- contactos ...000990-...000995) para no pisar otros archivos.

begin;
select plan(10);

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000980', 'rfv-corredor@test.local'),     -- admin de la corredora
  ('00000000-0000-0000-0000-000000000981', 'rfv-arrendador@test.local'),   -- admin de la org individual, invitado por el corredor
  ('00000000-0000-0000-0000-000000000982', 'rfv-outsider@test.local'),     -- sin ninguna relación
  ('00000000-0000-0000-0000-000000000983', 'rfv-arrendatario@test.local'), -- invitado por el arrendador, sin organización propia
  ('00000000-0000-0000-0000-000000000984', 'rfv-self@test.local');         -- para el caso degenerado (auto-carga)

insert into public.profiles (id, full_name) values
  ('00000000-0000-0000-0000-000000000980', 'Corredor RFV Test'),
  ('00000000-0000-0000-0000-000000000981', 'Arrendador RFV Test'),
  ('00000000-0000-0000-0000-000000000983', 'Arrendatario RFV Test')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000009d1', 'broker', 'Corredora RFV Test', '00000000-0000-0000-0000-000000000980'),
  ('00000000-0000-0000-0000-0000000009d2', 'individual', 'Dueña RFV Test', '00000000-0000-0000-0000-000000000981');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000000980', '00000000-0000-0000-0000-0000000009d1', 'admin'),
  ('00000000-0000-0000-0000-000000000981', '00000000-0000-0000-0000-0000000009d2', 'admin');

-- c1: "Corredor X agregó a Arrendador Y" — ya confirmado.
insert into public.contacts (id, organization_id, contact_role, full_name, email, status, user_id, confirmed_at, created_by) values
  ('00000000-0000-0000-0000-000000000990', '00000000-0000-0000-0000-0000000009d1', 'arrendador', 'Arrendador RFV Test', 'rfv-arrendador@test.local', 'confirmado', '00000000-0000-0000-0000-000000000981', now(), '00000000-0000-0000-0000-000000000980');

-- c2: "Arrendador Y invitó a Arrendatario Z" — ya confirmado. El
-- arrendatario no administra ninguna organización (nunca la tiene en
-- este modelo), así que este caso NO debe generar ninguna ficha inversa.
insert into public.contacts (id, organization_id, contact_role, full_name, email, status, user_id, confirmed_at, created_by) values
  ('00000000-0000-0000-0000-000000000991', '00000000-0000-0000-0000-0000000009d2', 'arrendatario', 'Arrendatario RFV Test', 'rfv-arrendatario@test.local', 'confirmado', '00000000-0000-0000-0000-000000000983', now(), '00000000-0000-0000-0000-000000000981');

create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- 1) Visibilidad de perfil para un contacto confirmado.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000980');
select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-000000000981'),
  'Arrendador RFV Test',
  'el corredor ve el perfil del arrendador que ya confirmó la invitación'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000982');
select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-000000000981'),
  0,
  'un outsider sin relación no ve el perfil del arrendador confirmado'
);
reset role;

-- ---------------------------------------------------------------------
-- 2) ensure_reciprocal_contact: el corredor queda como contacto del
--    arrendador (org 9d2), con el rol correcto y ya confirmado.
-- ---------------------------------------------------------------------
select public.ensure_reciprocal_contact('00000000-0000-0000-0000-000000000990', 'Corredor RFV Test', 'rfv-corredor@test.local');

select is(
  (select count(*)::int from public.contacts where organization_id = '00000000-0000-0000-0000-0000000009d2' and user_id = '00000000-0000-0000-0000-000000000980'),
  1,
  'el corredor queda cargado en la libreta del arrendador'
);

select is(
  (select contact_role::text from public.contacts where organization_id = '00000000-0000-0000-0000-0000000009d2' and user_id = '00000000-0000-0000-0000-000000000980'),
  'corredor',
  'la ficha inversa toma el rol correcto según el tipo de la organización que invitó (broker -> corredor)'
);

select is(
  (select status::text from public.contacts where organization_id = '00000000-0000-0000-0000-0000000009d2' and user_id = '00000000-0000-0000-0000-000000000980'),
  'confirmado',
  'la ficha inversa nace ya confirmada, no pendiente'
);

-- Idempotencia: volver a llamarla no duplica la ficha.
select public.ensure_reciprocal_contact('00000000-0000-0000-0000-000000000990', 'Corredor RFV Test', 'rfv-corredor@test.local');
select is(
  (select count(*)::int from public.contacts where organization_id = '00000000-0000-0000-0000-0000000009d2' and user_id = '00000000-0000-0000-0000-000000000980'),
  1,
  'llamarla de nuevo no duplica la ficha inversa'
);

-- ---------------------------------------------------------------------
-- 3) El arrendatario invitado no tiene organización propia -> no hay
--    ninguna libreta donde reciprocar, la función no hace nada.
-- ---------------------------------------------------------------------
select public.ensure_reciprocal_contact('00000000-0000-0000-0000-000000000991', 'Arrendador RFV Test', 'rfv-arrendador@test.local');
select is(
  (select count(*)::int from public.contacts where user_id = '00000000-0000-0000-0000-000000000981' and organization_id <> '00000000-0000-0000-0000-0000000009d1'),
  0,
  'un arrendatario invitado sin organización propia no genera ninguna ficha inversa'
);

-- ---------------------------------------------------------------------
-- 4) Caso degenerado: quien invitó y quien confirmó son la misma
--    persona (auto-carga/pruebas) -> tampoco genera nada.
-- ---------------------------------------------------------------------
insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000000984', '00000000-0000-0000-0000-0000000009d1', 'admin')
on conflict do nothing;
insert into public.contacts (id, organization_id, contact_role, full_name, email, status, user_id, confirmed_at, created_by) values
  ('00000000-0000-0000-0000-000000000992', '00000000-0000-0000-0000-0000000009d1', 'corredor', 'Auto Carga RFV Test', 'rfv-self@test.local', 'confirmado', '00000000-0000-0000-0000-000000000984', now(), '00000000-0000-0000-0000-000000000984');

select public.ensure_reciprocal_contact('00000000-0000-0000-0000-000000000992', 'Auto Carga RFV Test', 'rfv-self@test.local');
select is(
  (select count(*)::int from public.contacts where id <> '00000000-0000-0000-0000-000000000992' and (user_id = '00000000-0000-0000-0000-000000000984' or created_by = '00000000-0000-0000-0000-000000000984') and organization_id = '00000000-0000-0000-0000-0000000009d1' and full_name = 'Auto Carga RFV Test'),
  0,
  'quien invita y quien confirma siendo la misma persona no genera ninguna ficha inversa'
);

-- ---------------------------------------------------------------------
-- 5) Con la ficha inversa creada, la visibilidad de perfil queda de
--    verdad bidireccional: ahora el ARRENDADOR también ve al corredor.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000981');
select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-000000000980'),
  'Corredor RFV Test',
  'una vez creada la ficha inversa, el arrendador también ve el perfil del corredor'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000982');
select is(
  (select count(*)::int from public.profiles where id in ('00000000-0000-0000-0000-000000000980', '00000000-0000-0000-0000-000000000981')),
  0,
  'el outsider sigue sin ver ningún perfil, ni siquiera después de la reciprocidad'
);
reset role;

select * from finish();
rollback;
