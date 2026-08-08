-- pgTAP suite para Tanda D Fase 1, paso 5 (SENSIBLE): select_winning_candidate.
-- Cobertura centrada en los dos puntos delicados: (1) el corredor SÍ
-- puede elegir ganador (autorización nueva, acotada a esta función), pero
-- create_contract() -- el camino viejo, sin evaluación detrás -- sigue
-- siendo estrictamente del arrendador, sin ningún cambio; (2) al elegir
-- un ganador, el resto de los candidatos en_evaluacion de ESA MISMA
-- propiedad quedan no_seleccionado, y los de otras propiedades no se
-- tocan. Propio rango de UUID (...000950-...000957 usuarios,
-- ...0000009b1-...0000009b3 orgs) para no pisar otros archivos.

begin;
select plan(16);

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000950', 'swc-landlord@test.local'),        -- admin de la org dueña
  ('00000000-0000-0000-0000-000000000951', 'swc-corredor-admin@test.local'),  -- admin de la corredora
  ('00000000-0000-0000-0000-000000000952', 'swc-corredor-agente@test.local'), -- agente (no admin) de la corredora
  ('00000000-0000-0000-0000-000000000953', 'swc-outsider@test.local'),        -- sin ninguna membership
  ('00000000-0000-0000-0000-000000000954', 'swc-ganador-a@test.local'),       -- candidato confirmado, gana en la propiedad con corredor
  ('00000000-0000-0000-0000-000000000955', 'swc-perdedor@test.local'),        -- candidato confirmado, queda no_seleccionado
  ('00000000-0000-0000-0000-000000000956', 'swc-control@test.local'),         -- candidato de otra propiedad, no debe tocarse
  ('00000000-0000-0000-0000-000000000957', 'swc-ganador-c@test.local');       -- candidato confirmado, gana en la propiedad SIN corredor

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000009b1', 'individual', 'Dueña SWC Test', '00000000-0000-0000-0000-000000000950'),
  ('00000000-0000-0000-0000-0000000009b2', 'broker', 'Corredora SWC Test', '00000000-0000-0000-0000-000000000950'),
  ('00000000-0000-0000-0000-0000000009b3', 'individual', 'Dueña Control SWC Test', '00000000-0000-0000-0000-000000000950');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000000950', '00000000-0000-0000-0000-0000000009b1', 'admin'),
  ('00000000-0000-0000-0000-000000000951', '00000000-0000-0000-0000-0000000009b2', 'admin'),
  ('00000000-0000-0000-0000-000000000952', '00000000-0000-0000-0000-0000000009b2', 'agente'),
  ('00000000-0000-0000-0000-000000000956', '00000000-0000-0000-0000-0000000009b3', 'admin'); -- admin de su propia org, sin relación con las propiedades bajo prueba

-- 0a: con corredor delegado -- el corredor va a elegir ganador acá.
-- 0c: sin corredor -- el arrendador elige directo.
-- 0d: con corredor, limpia (sin contrato) -- para probar que create_contract() sigue sin admitir al corredor.
-- 0b: propiedad de control, de otra organización -- sus candidatos no deben tocarse.
insert into public.properties (id, organization_id, broker_organization_id, address, expected_rent_amount, expected_rent_currency, expected_term_months, expected_guarantee_amount, expected_guarantee_currency) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000009b1', '00000000-0000-0000-0000-0000000009b2', 'Propiedad SWC Con Corredor', 500000, 'CLP', 12, 500000, 'CLP'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000009b3', null, 'Propiedad SWC Control', null, null, null, null, null),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000009b1', null, 'Propiedad SWC Sin Corredor', 400000, 'CLP', 6, 400000, 'CLP'),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000009b1', '00000000-0000-0000-0000-0000000009b2', 'Propiedad SWC Limpia', 300000, 'CLP', 12, 300000, 'CLP');

insert into public.contacts (id, organization_id, contact_role, full_name, email, status, user_id, created_by) values
  ('00000000-0000-0000-0000-00000000091a', '00000000-0000-0000-0000-0000000009b1', 'arrendatario', 'Ganador Con Corredor', 'swc-ganador-a@test.local', 'confirmado', '00000000-0000-0000-0000-000000000954', '00000000-0000-0000-0000-000000000950'),
  ('00000000-0000-0000-0000-00000000091b', '00000000-0000-0000-0000-0000000009b1', 'arrendatario', 'Perdedor SWC', 'swc-perdedor@test.local', 'confirmado', '00000000-0000-0000-0000-000000000955', '00000000-0000-0000-0000-000000000950'),
  ('00000000-0000-0000-0000-00000000091c', '00000000-0000-0000-0000-0000000009b1', 'arrendatario', 'Pendiente SWC', 'swc-pendiente@test.local', 'pendiente', null, '00000000-0000-0000-0000-000000000950'),
  ('00000000-0000-0000-0000-00000000091d', '00000000-0000-0000-0000-0000000009b3', 'arrendatario', 'Control SWC', 'swc-control@test.local', 'confirmado', '00000000-0000-0000-0000-000000000956', '00000000-0000-0000-0000-000000000956'),
  ('00000000-0000-0000-0000-00000000091e', '00000000-0000-0000-0000-0000000009b1', 'arrendatario', 'Ganador Sin Corredor', 'swc-ganador-c@test.local', 'confirmado', '00000000-0000-0000-0000-000000000957', '00000000-0000-0000-0000-000000000950');

insert into public.property_candidates (property_id, contact_id, status) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000091a', 'en_evaluacion'), -- pc1: gana
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000091b', 'en_evaluacion'), -- pc2: debe terminar no_seleccionado
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000091c', 'en_evaluacion'), -- pc3: pendiente, no puede ganar
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000091d', 'en_evaluacion'), -- pc4: control, otra propiedad
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-00000000091e', 'en_evaluacion'); -- pc5: gana sin corredor

create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- Autorización: un outsider no puede elegir ganador.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000953');
select throws_ok(
  $$ select public.select_winning_candidate((select id from public.property_candidates where contact_id = '00000000-0000-0000-0000-00000000091b'), current_date, current_date, 1, 'CLP', 'CLP', 1) $$,
  'P0001',
  null,
  'un outsider sin membership no puede elegir un ganador'
);
reset role;

-- ---------------------------------------------------------------------
-- Autorización: un agente (no admin) de la corredora no puede elegir ganador.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000952');
select throws_ok(
  $$ select public.select_winning_candidate((select id from public.property_candidates where contact_id = '00000000-0000-0000-0000-00000000091b'), current_date, current_date, 1, 'CLP', 'CLP', 1) $$,
  'P0001',
  null,
  'un agente (no admin) de la corredora no puede elegir un ganador'
);
reset role;

-- ---------------------------------------------------------------------
-- Un candidato pendiente (sin cuenta confirmada) no puede ganar, aunque
-- quien llame sea un admin autorizado.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000951');
select throws_ok(
  $$ select public.select_winning_candidate((select id from public.property_candidates where contact_id = '00000000-0000-0000-0000-00000000091c'), current_date, current_date + 365, 500000, 'CLP', 'CLP', 500000) $$,
  'P0001',
  null,
  'un candidato pendiente (sin cuenta confirmada) no puede ganar'
);
reset role;

-- ---------------------------------------------------------------------
-- EL PUNTO CENTRAL: el CORREDOR (admin de la organización delegada, no
-- dueño de la propiedad) elige ganador en la propiedad con corredor.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000951');
select lives_ok(
  $$ select public.select_winning_candidate((select id from public.property_candidates where contact_id = '00000000-0000-0000-0000-00000000091a'), '2026-01-01', '2027-01-01', 500000, 'CLP', 'CLP', 500000) $$,
  'el corredor (admin de la corredora delegada) SÍ puede elegir ganador'
);
reset role;

select is(
  (select count(*)::int from public.contracts where property_id = '00000000-0000-0000-0000-0000000000a1'),
  1,
  'se creó exactamente un contrato para la propiedad con corredor'
);

select is(
  (select role::text from public.contract_parties where contract_id = (select id from public.contracts where property_id = '00000000-0000-0000-0000-0000000000a1') and user_id = '00000000-0000-0000-0000-000000000950'),
  'arrendador',
  'el arrendador del contrato es el DUEÑO de la propiedad, no quien llamó a la función (el corredor)'
);

select is(
  (select role::text from public.contract_parties where contract_id = (select id from public.contracts where property_id = '00000000-0000-0000-0000-0000000000a1') and user_id = '00000000-0000-0000-0000-000000000954'),
  'arrendatario',
  'el candidato ganador quedó como arrendatario del contrato'
);

select is(
  (select count(*)::int from public.contract_parties where contract_id = (select id from public.contracts where property_id = '00000000-0000-0000-0000-0000000000a1') and role = 'corredor'),
  2,
  'todo el staff de la corredora (admin + agente) quedó como parte corredor del contrato'
);

select is(
  (select status::text from public.property_candidates where contact_id = '00000000-0000-0000-0000-00000000091a'),
  'seleccionado',
  'el candidato ganador quedó marcado seleccionado'
);

select is(
  (select status::text from public.property_candidates where contact_id = '00000000-0000-0000-0000-00000000091b'),
  'no_seleccionado',
  'el otro candidato en_evaluacion de la MISMA propiedad quedó no_seleccionado'
);

select is(
  (select status::text from public.property_candidates where contact_id = '00000000-0000-0000-0000-00000000091c'),
  'no_seleccionado',
  'el candidato pendiente de la misma propiedad también quedó no_seleccionado (competía igual)'
);

select is(
  (select status::text from public.property_candidates where contact_id = '00000000-0000-0000-0000-00000000091d'),
  'en_evaluacion',
  'el candidato de OTRA propiedad (control) no se tocó'
);

-- ---------------------------------------------------------------------
-- Un candidato ya resuelto (seleccionado) no se puede volver a elegir.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000951');
select throws_ok(
  $$ select public.select_winning_candidate((select id from public.property_candidates where contact_id = '00000000-0000-0000-0000-00000000091a'), current_date, current_date + 365, 1, 'CLP', 'CLP', 1) $$,
  'P0001',
  null,
  'un candidato que ya ganó no se puede volver a elegir'
);
reset role;

-- ---------------------------------------------------------------------
-- El ARRENDADOR elige directo en una propiedad SIN corredor delegado.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000950');
select lives_ok(
  $$ select public.select_winning_candidate((select id from public.property_candidates where contact_id = '00000000-0000-0000-0000-00000000091e'), '2026-01-01', '2026-07-01', 400000, 'CLP', 'CLP', 400000) $$,
  'el arrendador puede elegir ganador directo en una propiedad sin corredor'
);
reset role;

select is(
  (select count(*)::int from public.contract_parties where contract_id = (select id from public.contracts where property_id = '00000000-0000-0000-0000-0000000000a3') and role = 'corredor'),
  0,
  'sin corredor delegado, no se agrega ninguna parte corredor'
);

-- ---------------------------------------------------------------------
-- REGRESIÓN: create_contract() (el camino viejo, sin evaluación detrás)
-- sigue siendo estrictamente del arrendador -- el corredor NO gana
-- ningún poder nuevo ahí, aunque sí lo tenga en select_winning_candidate().
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000951');
select throws_ok(
  $$ select public.create_contract('00000000-0000-0000-0000-0000000000a4', current_date, current_date + 365, 300000, 'CLP', 'CLP', 300000) $$,
  'P0001',
  null,
  'create_contract() sigue rechazando al corredor -- su autorización no cambió'
);
reset role;

select * from finish();
rollback;
