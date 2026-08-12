-- pgTAP suite para Tanda D Fase 1, paso 6 (SENSIBLE): deshacer una
-- adjudicación, por los dos caminos que llegan ahí (cancel_contract() y
-- undo_winning_candidate()). Foco especial en el caso más delicado: que
-- revertir NO reviva a un candidato que el corredor ya había descartado
-- a mano ANTES de la adjudicación (distinto de los que la adjudicación
-- misma descartó). Propio rango de UUID (...000970-...000977 usuarios,
-- ...0000009c1-...0000009c3 orgs) para no pisar otros archivos.

begin;
select plan(19);

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000970', 'uwc-landlord@test.local'),        -- admin de la org dueña
  ('00000000-0000-0000-0000-000000000971', 'uwc-corredor-admin@test.local'),  -- admin de la corredora
  ('00000000-0000-0000-0000-000000000972', 'uwc-outsider@test.local'),        -- sin ninguna membership
  ('00000000-0000-0000-0000-000000000973', 'uwc-ganador@test.local'),         -- gana, después se deshace
  ('00000000-0000-0000-0000-000000000974', 'uwc-perdedor-adjudicacion@test.local'), -- lo tumba la adjudicación -- debe volver
  ('00000000-0000-0000-0000-000000000975', 'uwc-descartado-antes@test.local'), -- descartado A MANO antes -- NO debe volver
  ('00000000-0000-0000-0000-000000000976', 'uwc-ganador-cancela@test.local'), -- gana en propiedad B, se cancela (no se borra)
  ('00000000-0000-0000-0000-000000000977', 'uwc-ganador-firmado@test.local'); -- gana en propiedad C, firma el arrendador -- ya no se puede deshacer

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000009c1', 'individual', 'Dueña UWC Test', '00000000-0000-0000-0000-000000000970'),
  ('00000000-0000-0000-0000-0000000009c2', 'broker', 'Corredora UWC Test', '00000000-0000-0000-0000-000000000970');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000000970', '00000000-0000-0000-0000-0000000009c1', 'admin'),
  ('00000000-0000-0000-0000-000000000971', '00000000-0000-0000-0000-0000000009c2', 'admin');

-- b1: se deshace por completo (undo_winning_candidate). b2: se cancela
-- (cancel_contract, el contrato queda como registro). b3: gana y el
-- arrendador firma -- ya no se puede deshacer.
insert into public.properties (id, organization_id, broker_organization_id, address, expected_rent_amount, expected_rent_currency, expected_term_months, expected_guarantee_amount, expected_guarantee_currency) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000009c1', '00000000-0000-0000-0000-0000000009c2', 'Propiedad UWC Deshacer', 500000, 'CLP', 12, 500000, 'CLP'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000009c1', null, 'Propiedad UWC Cancelar', 400000, 'CLP', 12, 400000, 'CLP'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000009c1', null, 'Propiedad UWC Firmada', 300000, 'CLP', 12, 300000, 'CLP');

insert into public.contacts (id, organization_id, contact_role, full_name, email, status, user_id, created_by) values
  ('00000000-0000-0000-0000-0000000009a1', '00000000-0000-0000-0000-0000000009c1', 'arrendatario', 'Ganador UWC', 'uwc-ganador@test.local', 'confirmado', '00000000-0000-0000-0000-000000000973', '00000000-0000-0000-0000-000000000970'),
  ('00000000-0000-0000-0000-0000000009a2', '00000000-0000-0000-0000-0000000009c1', 'arrendatario', 'Perdedor Por Adjudicacion', 'uwc-perdedor-adjudicacion@test.local', 'confirmado', '00000000-0000-0000-0000-000000000974', '00000000-0000-0000-0000-000000000970'),
  ('00000000-0000-0000-0000-0000000009a3', '00000000-0000-0000-0000-0000000009c1', 'arrendatario', 'Descartado Antes', 'uwc-descartado-antes@test.local', 'confirmado', '00000000-0000-0000-0000-000000000975', '00000000-0000-0000-0000-000000000970'),
  ('00000000-0000-0000-0000-0000000009a4', '00000000-0000-0000-0000-0000000009c1', 'arrendatario', 'Ganador Cancela', 'uwc-ganador-cancela@test.local', 'confirmado', '00000000-0000-0000-0000-000000000976', '00000000-0000-0000-0000-000000000970'),
  ('00000000-0000-0000-0000-0000000009a5', '00000000-0000-0000-0000-0000000009c1', 'arrendatario', 'Ganador Firmado', 'uwc-ganador-firmado@test.local', 'confirmado', '00000000-0000-0000-0000-000000000977', '00000000-0000-0000-0000-000000000970');

create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- Propiedad B1 (se deshace por completo): pc1 gana, pc2 queda
-- no_seleccionado POR la adjudicación. pc3 ya estaba no_seleccionado
-- ANTES (descartado a mano) -- no debe revivir.
-- ---------------------------------------------------------------------
-- updated_at de c003 forzado a una hora atrás a propósito: en Postgres
-- now() es constante durante TODA una transacción, y esta suite entera
-- corre en una sola (begin ... rollback) -- sin esto, el fixture y la
-- adjudicación de más abajo compartirían el mismo now() y el test no
-- podría distinguir nada. En producción cada acción es su propia
-- transacción, así que esta diferencia siempre existe sola.
insert into public.property_candidates (id, property_id, contact_id, status, updated_at) values
  ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000009a1', 'en_evaluacion', now()),
  ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000009a2', 'en_evaluacion', now()),
  ('00000000-0000-0000-0000-00000000c003', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000009a3', 'no_seleccionado', now() - interval '1 hour'); -- ya descartado antes de adjudicar, a propósito

select pg_temp.login_as('00000000-0000-0000-0000-000000000971'); -- corredor
select lives_ok(
  $$ select public.select_winning_candidate('00000000-0000-0000-0000-00000000c001', '2026-01-01', '2027-01-01', 500000, 'CLP', 'CLP', 500000) $$,
  'setup: el corredor adjudica al ganador en la propiedad B1'
);
reset role;

-- ---------------------------------------------------------------------
-- Autorización: un outsider no puede deshacer.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000972');
select throws_ok(
  $$ select public.undo_winning_candidate((select id from public.contracts where property_id = '00000000-0000-0000-0000-0000000000b1')) $$,
  'P0001',
  null,
  'un outsider sin membership no puede deshacer la adjudicación'
);
reset role;

-- ---------------------------------------------------------------------
-- EL CAMINO NUEVO: el corredor deshace por completo (nadie firmó).
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000971');
select lives_ok(
  $$ select public.undo_winning_candidate((select id from public.contracts where property_id = '00000000-0000-0000-0000-0000000000b1')) $$,
  'el corredor puede deshacer la adjudicación mientras nadie firmó'
);
reset role;

select is(
  (select count(*)::int from public.contracts where property_id = '00000000-0000-0000-0000-0000000000b1'),
  0,
  'el contrato se borró por completo al deshacer'
);

select is(
  (select count(*)::int from public.guarantees g join public.contracts c on c.id = g.contract_id where c.property_id = '00000000-0000-0000-0000-0000000000b1'),
  0,
  'la garantía asociada también se borró (no queda huérfana)'
);

select is(
  (select status::text from public.property_candidates where id = '00000000-0000-0000-0000-00000000c001'),
  'en_evaluacion',
  'el candidato ganador vuelve a en_evaluacion'
);

select is(
  (select status::text from public.property_candidates where id = '00000000-0000-0000-0000-00000000c002'),
  'en_evaluacion',
  'el candidato que la adjudicación tumbó también vuelve a en_evaluacion'
);

select is(
  (select status::text from public.property_candidates where id = '00000000-0000-0000-0000-00000000c003'),
  'no_seleccionado',
  'EL PUNTO DELICADO: el candidato descartado A MANO antes de adjudicar NO revive -- updated_at distinto lo distingue'
);

-- ---------------------------------------------------------------------
-- Propiedad B2 (se cancela, no se borra): mismo patrón, pero por
-- cancel_contract() -- el bug reportado originalmente.
-- ---------------------------------------------------------------------
insert into public.property_candidates (id, property_id, contact_id, status) values
  ('00000000-0000-0000-0000-00000000c004', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000009a4', 'en_evaluacion');

select pg_temp.login_as('00000000-0000-0000-0000-000000000970'); -- arrendador (sin corredor en esta propiedad)
select lives_ok(
  $$ select public.select_winning_candidate('00000000-0000-0000-0000-00000000c004', '2026-01-01', '2027-01-01', 400000, 'CLP', 'CLP', 400000) $$,
  'setup: el arrendador adjudica en la propiedad B2'
);
reset role;

select is(
  (select status::text from public.property_candidates where id = '00000000-0000-0000-0000-00000000c004'),
  'seleccionado',
  'setup: el candidato de B2 quedó seleccionado'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000970');
select lives_ok(
  $$ select public.cancel_contract((select id from public.contracts where property_id = '00000000-0000-0000-0000-0000000000b2')) $$,
  'el arrendador cancela el contrato de B2 (en vez de deshacerlo)'
);
reset role;

select is(
  (select status::text from public.contracts where property_id = '00000000-0000-0000-0000-0000000000b2'),
  'cancelado',
  'BUG ORIGINAL RESUELTO -- parte 1: cancelar deja el contrato como registro (cancelado), no lo borra'
);

select is(
  (select status::text from public.property_candidates where id = '00000000-0000-0000-0000-00000000c004'),
  'en_evaluacion',
  'BUG ORIGINAL RESUELTO -- parte 2: cancelar el contrato también libera al candidato de vuelta a en_evaluacion'
);

-- ---------------------------------------------------------------------
-- Propiedad B3: una vez que el arrendador firma, ya no se puede deshacer
-- (sí se podría seguir cancelando -- eso no cambia acá).
-- ---------------------------------------------------------------------
insert into public.property_candidates (id, property_id, contact_id, status) values
  ('00000000-0000-0000-0000-00000000c005', '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000009a5', 'en_evaluacion');

select pg_temp.login_as('00000000-0000-0000-0000-000000000970');
select lives_ok(
  $$ select public.select_winning_candidate('00000000-0000-0000-0000-00000000c005', '2026-01-01', '2027-01-01', 300000, 'CLP', 'CLP', 300000) $$,
  'setup: el arrendador adjudica en la propiedad B3'
);

select lives_ok(
  $$ select public.sign_contract_landlord((select id from public.contracts where property_id = '00000000-0000-0000-0000-0000000000b3')) $$,
  'setup: el arrendador firma el contrato de B3'
);
reset role;

select throws_ok(
  $$ select public.undo_winning_candidate((select id from public.contracts where property_id = '00000000-0000-0000-0000-0000000000b3')) $$,
  'P0001',
  null,
  'una vez que alguien firmó, ya no se puede deshacer la adjudicación'
);

select is(
  (select count(*)::int from public.contracts where property_id = '00000000-0000-0000-0000-0000000000b3'),
  1,
  'el contrato de B3 sigue existiendo -- el intento de deshacer no lo tocó'
);

select is(
  (select status::text from public.property_candidates where id = '00000000-0000-0000-0000-00000000c005'),
  'seleccionado',
  'el candidato de B3 sigue seleccionado -- el intento de deshacer no lo tocó'
);

-- ---------------------------------------------------------------------
-- Deshacer un contrato inexistente falla limpio.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000970');
select throws_ok(
  $$ select public.undo_winning_candidate('00000000-0000-0000-0000-000000000000') $$,
  'P0001',
  null,
  'deshacer un contrato inexistente lanza un error, no falla en silencio'
);
reset role;

select * from finish();
rollback;
