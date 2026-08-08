-- pgTAP suite para Tanda D Fase 1 (paso seguro 1): tabla property_candidates
-- + su RLS + el trigger de "propiedad ocupada". No cubre la conversión
-- candidato→arrendatario (paso sensible, todavía no construido) — acá
-- solo se prueba que el modelo aguanta candidatos y sus transiciones
-- seguras (en_evaluacion <-> no_seleccionado), y que 'seleccionado' es
-- inalcanzable desde una UPDATE de cliente. Propio rango de UUID
-- (...000900-...000903 usuarios, ...0000009a1-...0000009a3 orgs) para no
-- pisar otros archivos, aunque cada uno corre en su propia transacción.

begin;
select plan(16);

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000900', 'candidatos-arrendador@test.local'),  -- admin de la org dueña
  ('00000000-0000-0000-0000-000000000901', 'candidatos-agente-corredor@test.local'), -- agente (no admin) de la corredora
  ('00000000-0000-0000-0000-000000000902', 'candidatos-outsider@test.local'),    -- sin ninguna membership
  ('00000000-0000-0000-0000-000000000903', 'candidatos-arrendatario@test.local'); -- el propio candidato, cuenta ya registrada

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000009a1', 'individual', 'Dueña Candidatos Test', '00000000-0000-0000-0000-000000000900'),
  ('00000000-0000-0000-0000-0000000009a2', 'broker', 'Corredora Candidatos Test', '00000000-0000-0000-0000-000000000900'),
  ('00000000-0000-0000-0000-0000000009a3', 'individual', 'Org Ajena Candidatos Test', '00000000-0000-0000-0000-000000000900');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000000900', '00000000-0000-0000-0000-0000000009a1', 'admin'),
  ('00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-0000000009a2', 'agente');

insert into public.properties (id, organization_id, broker_organization_id, address) values
  ('00000000-0000-0000-0000-00000000090a', '00000000-0000-0000-0000-0000000009a1', '00000000-0000-0000-0000-0000000009a2', 'Casa Candidatos 1'),
  ('00000000-0000-0000-0000-00000000090b', '00000000-0000-0000-0000-0000000009a1', null, 'Casa Candidatos 2 (sin corredora)');

-- contacto arrendatario válido, de la org dueña
insert into public.contacts (id, organization_id, contact_role, full_name, email, status, user_id, created_by) values
  ('00000000-0000-0000-0000-00000000091a', '00000000-0000-0000-0000-0000000009a1', 'arrendatario', 'Candidato Confirmado', 'candidatos-arrendatario@test.local', 'confirmado', '00000000-0000-0000-0000-000000000903', '00000000-0000-0000-0000-000000000900');

-- contacto pendiente (sin cuenta todavía) — debe poder ser candidato igual
insert into public.contacts (id, organization_id, contact_role, full_name, email, status, created_by) values
  ('00000000-0000-0000-0000-00000000091b', '00000000-0000-0000-0000-0000000009a1', 'arrendatario', 'Candidato Pendiente', 'candidato-pendiente@test.local', 'pendiente', '00000000-0000-0000-0000-000000000900');

-- contacto de la MISMA org pero rol arrendador (no candidato válido)
insert into public.contacts (id, organization_id, contact_role, full_name, email, status, created_by) values
  ('00000000-0000-0000-0000-00000000091c', '00000000-0000-0000-0000-0000000009a1', 'arrendador', 'Copropietario No Candidato', 'copropietario@test.local', 'pendiente', '00000000-0000-0000-0000-000000000900');

-- contacto arrendatario de una org AJENA (ni dueña ni corredora de la propiedad)
insert into public.contacts (id, organization_id, contact_role, full_name, email, status, created_by) values
  ('00000000-0000-0000-0000-00000000091d', '00000000-0000-0000-0000-0000000009a3', 'arrendatario', 'Candidato Ajeno', 'ajeno@test.local', 'pendiente', '00000000-0000-0000-0000-000000000900');

create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- INSERT: admin de la org dueña puede agregar un candidato arrendatario
-- de su propia libreta.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000900');
select lives_ok(
  $$ insert into public.property_candidates (property_id, contact_id) values ('00000000-0000-0000-0000-00000000090a', '00000000-0000-0000-0000-00000000091a') $$,
  'el admin de la org dueña puede agregar un candidato arrendatario de su libreta'
);
reset role;

-- ---------------------------------------------------------------------
-- INSERT: un contacto con rol arrendador (no arrendatario) no puede ser candidato.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000900');
select throws_ok(
  $$ insert into public.property_candidates (property_id, contact_id) values ('00000000-0000-0000-0000-00000000090a', '00000000-0000-0000-0000-00000000091c') $$,
  '42501',
  null,
  'un contacto con contact_role=arrendador no puede agregarse como candidato'
);
reset role;

-- ---------------------------------------------------------------------
-- INSERT: un contacto de una organización ajena (ni dueña ni corredora) no puede agregarse.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000900');
select throws_ok(
  $$ insert into public.property_candidates (property_id, contact_id) values ('00000000-0000-0000-0000-00000000090a', '00000000-0000-0000-0000-00000000091d') $$,
  '42501',
  null,
  'un contacto de una organización ajena a la propiedad no puede agregarse como candidato'
);
reset role;

-- ---------------------------------------------------------------------
-- INSERT: un agente (no admin) de la corredora no puede agregar candidatos.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000901');
select throws_ok(
  $$ insert into public.property_candidates (property_id, contact_id) values ('00000000-0000-0000-0000-00000000090a', '00000000-0000-0000-0000-00000000091b') $$,
  '42501',
  null,
  'un agente (no admin) de la corredora no puede agregar candidatos'
);
reset role;

-- ---------------------------------------------------------------------
-- INSERT: un outsider total no puede agregar candidatos.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000902');
select throws_ok(
  $$ insert into public.property_candidates (property_id, contact_id) values ('00000000-0000-0000-0000-00000000090a', '00000000-0000-0000-0000-00000000091b') $$,
  '42501',
  null,
  'un outsider sin membership no puede agregar candidatos'
);
reset role;

-- ---------------------------------------------------------------------
-- INSERT: un contacto pendiente (sin cuenta) SÍ puede agregarse como candidato
-- — solo no podrá ganar hasta confirmar (eso lo valida el paso sensible, no acá).
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000900');
select lives_ok(
  $$ insert into public.property_candidates (property_id, contact_id) values ('00000000-0000-0000-0000-00000000090a', '00000000-0000-0000-0000-00000000091b') $$,
  'un contacto pendiente (sin cuenta todavía) puede agregarse como candidato en evaluación'
);
reset role;

-- ---------------------------------------------------------------------
-- Duplicado: el mismo contacto no puede ser candidato dos veces a la misma propiedad.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000900');
select throws_ok(
  $$ insert into public.property_candidates (property_id, contact_id) values ('00000000-0000-0000-0000-00000000090a', '00000000-0000-0000-0000-00000000091a') $$,
  '23505',
  null,
  'el mismo contacto no puede quedar dos veces como candidato de la misma propiedad'
);
reset role;

-- ---------------------------------------------------------------------
-- SELECT: un agente (miembro, no admin) de la corredora SÍ puede ver los candidatos.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000901');
select is(
  (select count(*)::int from public.property_candidates where property_id = '00000000-0000-0000-0000-00000000090a'),
  2,
  'un agente (miembro) de la corredora puede ver los candidatos de la propiedad'
);
reset role;

-- ---------------------------------------------------------------------
-- SELECT: un outsider no ve nada.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000902');
select is(
  (select count(*)::int from public.property_candidates where property_id = '00000000-0000-0000-0000-00000000090a'),
  0,
  'un outsider sin membership no ve ningún candidato'
);
reset role;

-- ---------------------------------------------------------------------
-- UPDATE: admin puede marcar un candidato como no_seleccionado.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000900');
select lives_ok(
  $$ update public.property_candidates set status = 'no_seleccionado' where property_id = '00000000-0000-0000-0000-00000000090a' and contact_id = '00000000-0000-0000-0000-00000000091b' $$,
  'el admin puede marcar un candidato como no_seleccionado'
);
reset role;

-- ---------------------------------------------------------------------
-- UPDATE: admin puede reactivar (no_seleccionado -> en_evaluacion) en una propiedad libre.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000900');
select lives_ok(
  $$ update public.property_candidates set status = 'en_evaluacion' where property_id = '00000000-0000-0000-0000-00000000090a' and contact_id = '00000000-0000-0000-0000-00000000091b' $$,
  'el admin puede reactivar un candidato no_seleccionado en una propiedad libre'
);
reset role;

-- ---------------------------------------------------------------------
-- UPDATE: nadie puede poner status='seleccionado' directo desde una UPDATE de cliente
-- — ese salto queda reservado para la futura función que también crea el contrato.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000900');
select throws_ok(
  $$ update public.property_candidates set status = 'seleccionado' where property_id = '00000000-0000-0000-0000-00000000090a' and contact_id = '00000000-0000-0000-0000-00000000091a' $$,
  '42501',
  null,
  'ninguna UPDATE de cliente puede poner status=seleccionado directo'
);
reset role;

-- ---------------------------------------------------------------------
-- UPDATE: un agente (no admin) no puede cambiar el estado de un candidato.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000901');
select throws_ok(
  $$ update public.property_candidates set status = 'no_seleccionado' where property_id = '00000000-0000-0000-0000-00000000090a' and contact_id = '00000000-0000-0000-0000-00000000091a' $$,
  '42501',
  null,
  'un agente (no admin) no puede cambiar el estado de un candidato'
);
reset role;

-- ---------------------------------------------------------------------
-- Trigger "ocupada": una propiedad con un contrato que no terminó no admite candidatos nuevos.
-- ---------------------------------------------------------------------
insert into public.contracts (id, property_id, status, start_date, end_date, rent_amount, rent_currency, guarantee_currency, guarantee_amount) values
  ('00000000-0000-0000-0000-00000000092a', '00000000-0000-0000-0000-00000000090b', 'pendiente_firma_arrendador', '2026-01-01', '2027-01-01', 500000, 'CLP', 'CLP', 500000);

select pg_temp.login_as('00000000-0000-0000-0000-000000000900');
select throws_ok(
  $$ insert into public.property_candidates (property_id, contact_id) values ('00000000-0000-0000-0000-00000000090b', '00000000-0000-0000-0000-00000000091a') $$,
  'P0001',
  null,
  'una propiedad con un contrato sin terminar no admite candidatos nuevos'
);
reset role;

-- ---------------------------------------------------------------------
-- Trigger "ocupada": tampoco admite REACTIVAR un candidato existente ahí.
-- ---------------------------------------------------------------------
insert into public.property_candidates (property_id, contact_id, status) values
  ('00000000-0000-0000-0000-00000000090b', '00000000-0000-0000-0000-00000000091d', 'no_seleccionado');

select pg_temp.login_as('00000000-0000-0000-0000-000000000900');
select throws_ok(
  $$ update public.property_candidates set status = 'en_evaluacion' where property_id = '00000000-0000-0000-0000-00000000090b' and contact_id = '00000000-0000-0000-0000-00000000091d' $$,
  'P0001',
  null,
  'tampoco se puede reactivar un candidato no_seleccionado en una propiedad ocupada'
);
reset role;

-- ---------------------------------------------------------------------
-- Trigger "ocupada": un contrato cancelado no cuenta como ocupación — sigue admitiendo candidatos.
-- ---------------------------------------------------------------------
update public.contracts set status = 'cancelado' where id = '00000000-0000-0000-0000-00000000092a';

select pg_temp.login_as('00000000-0000-0000-0000-000000000900');
select lives_ok(
  $$ insert into public.property_candidates (property_id, contact_id) values ('00000000-0000-0000-0000-00000000090b', '00000000-0000-0000-0000-00000000091a') $$,
  'un contrato cancelado no cuenta como ocupación — la propiedad vuelve a admitir candidatos'
);
reset role;

select * from finish();
rollback;
