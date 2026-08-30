-- pgTAP suite para la migración 20260829100001 (Evaluación de papeles,
-- Etapa 0 — solo modelo de datos, sin server actions ni UI todavía).
-- Cubre lo genuinamente sensible: quién ve documentos/consentimientos
-- de quién, que un consentimiento sea inmodificable de verdad (a nivel
-- de GRANT, no solo de policy), y que las columnas de estado terminal
-- no se puedan tocar con una UPDATE cruda de cliente.
--
-- Propio rango de UUID, bien lejos de los demás archivos: usuarios
-- ...000001000-...000001009, orgs ...0000000010a1/10a2, propiedad
-- ...0000000010c1, candidatura ...0000000010d1, participantes
-- ...0000000010e1-10e3, documentos/consentimientos con id explícito
-- donde hace falta referenciarlos.

begin;
select plan(22);

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000001001', 'cp-arrendador@test.local'),     -- admin de la org dueña
  ('00000000-0000-0000-0000-000000001002', 'cp-corredor@test.local'),       -- admin de la corredora delegada
  ('00000000-0000-0000-0000-000000001003', 'cp-agente@test.local'),         -- agente (no admin) de la corredora
  ('00000000-0000-0000-0000-000000001004', 'cp-titular@test.local'),        -- titular, ya confirmado como contacto
  ('00000000-0000-0000-0000-000000001005', 'cp-codeudor@test.local'),       -- codeudor, ya con cuenta (invitado, todavía sin vincular la fila)
  ('00000000-0000-0000-0000-000000001006', 'cp-outsider@test.local');       -- sin ninguna relación

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000010a1', 'individual', 'Dueña CP Test', '00000000-0000-0000-0000-000000001001'),
  ('00000000-0000-0000-0000-0000000010a2', 'broker', 'Corredora CP Test', '00000000-0000-0000-0000-000000001002');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-0000000010a1', 'admin'),
  ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-0000000010a2', 'admin'),
  ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-0000000010a2', 'agente');

insert into public.properties (id, organization_id, broker_organization_id, address) values
  ('00000000-0000-0000-0000-0000000010c1', '00000000-0000-0000-0000-0000000010a1', '00000000-0000-0000-0000-0000000010a2', 'Propiedad CP Test');

insert into public.contacts (id, organization_id, contact_role, full_name, email, status, user_id, confirmed_at, created_by) values
  ('00000000-0000-0000-0000-0000000010b1', '00000000-0000-0000-0000-0000000010a1', 'arrendatario', 'Titular CP Test', 'cp-titular@test.local', 'confirmado', '00000000-0000-0000-0000-000000001004', now(), '00000000-0000-0000-0000-000000001001');

insert into public.property_candidates (id, property_id, contact_id) values
  ('00000000-0000-0000-0000-0000000010d1', '00000000-0000-0000-0000-0000000010c1', '00000000-0000-0000-0000-0000000010b1');

insert into public.candidate_participants (id, property_candidate_id, participant_type, full_name, email, status, user_id, created_by) values
  ('00000000-0000-0000-0000-0000000010e1', '00000000-0000-0000-0000-0000000010d1', 'titular', 'Titular CP Test', 'cp-titular@test.local', 'en_progreso', '00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000001001'),
  ('00000000-0000-0000-0000-0000000010e2', '00000000-0000-0000-0000-0000000010d1', 'codeudor', 'Codeudor CP Test', 'cp-codeudor@test.local', 'invitado', null, '00000000-0000-0000-0000-000000001001');

create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- 1) Visibilidad de candidate_participants
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000001001'); -- arrendador (org dueña)
select is(
  (select count(*)::int from public.candidate_participants where property_candidate_id = '00000000-0000-0000-0000-0000000010d1'),
  2,
  'el arrendador (org dueña) ve los dos participantes de su propiedad'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000001003'); -- agente de la corredora delegada (no admin)
select is(
  (select count(*)::int from public.candidate_participants where property_candidate_id = '00000000-0000-0000-0000-0000000010d1'),
  2,
  'un agente (no admin) de la corredora delegada también ve los participantes'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000001004'); -- el propio titular
select is(
  (select count(*)::int from public.candidate_participants where id = '00000000-0000-0000-0000-0000000010e1'),
  1,
  'el propio titular ve su fila'
);
select is(
  (select count(*)::int from public.candidate_participants where id = '00000000-0000-0000-0000-0000000010e2'),
  0,
  'el titular NO ve la fila del codeudor (no comparte org ni es la suya)'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000001006'); -- outsider
select is(
  (select count(*)::int from public.candidate_participants where property_candidate_id = '00000000-0000-0000-0000-0000000010d1'),
  0,
  'un outsider sin ninguna relación no ve ningún participante'
);
reset role;

-- ---------------------------------------------------------------------
-- 2) Insert: solo un admin de la org dueña o la corredora delegada
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000001003'); -- agente, no admin
select throws_ok(
  $$ insert into public.candidate_participants (property_candidate_id, participant_type, full_name, email, created_by) values
     ('00000000-0000-0000-0000-0000000010d1', 'coarrendatario', 'Colado CP Test', 'cp-colado@test.local', '00000000-0000-0000-0000-000000001003') $$,
  '42501',
  null,
  'un agente sin permiso de admin no puede agregar un participante'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000001002'); -- admin de la corredora delegada
select lives_ok(
  $$ insert into public.candidate_participants (property_candidate_id, participant_type, full_name, email, created_by) values
     ('00000000-0000-0000-0000-0000000010d1', 'coarrendatario', 'Coarrendatario CP Test', 'cp-coarrendatario@test.local', '00000000-0000-0000-0000-000000001002') $$,
  'el admin de la corredora delegada sí puede agregar un participante'
);
reset role;

-- Un segundo titular para la MISMA candidatura debe chocar con el
-- índice único parcial, sin importar quién lo intente.
select pg_temp.login_as('00000000-0000-0000-0000-000000001001');
select throws_ok(
  $$ insert into public.candidate_participants (property_candidate_id, participant_type, full_name, email, created_by) values
     ('00000000-0000-0000-0000-0000000010d1', 'titular', 'Segundo Titular CP Test', 'cp-segundo-titular@test.local', '00000000-0000-0000-0000-000000001001') $$,
  '23505',
  null,
  'el índice único parcial bloquea un segundo titular en la misma candidatura'
);
reset role;

-- ---------------------------------------------------------------------
-- 3) Defensa en profundidad: una UPDATE cruda de cliente no puede dejar
--    'completado' — eso nace solo en la función SECURITY DEFINER de la
--    Etapa 2 (todavía no construida).
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000001001');
select throws_ok(
  $$ update public.candidate_participants set status = 'completado' where id = '00000000-0000-0000-0000-0000000010e1' $$,
  '42501',
  null,
  'ni un admin de la org dueña puede marcar completado con una UPDATE directa'
);
reset role;

-- Pero SÍ puede actualizar otros campos (ej. corregir el email antes de
-- invitar) mientras no toque el estado hacia completado.
select pg_temp.login_as('00000000-0000-0000-0000-000000001001');
select lives_ok(
  $$ update public.candidate_participants set full_name = 'Codeudor CP Test (corregido)' where id = '00000000-0000-0000-0000-0000000010e2' $$,
  'un admin sí puede corregir campos normales, mientras no fuerce completado'
);
reset role;

-- ---------------------------------------------------------------------
-- 4) candidate_documents: subir es solo del propio participante — ni
--    siquiera un admin de la organización sube en nombre de otro.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000001004'); -- el propio titular
select lives_ok(
  $$ insert into public.candidate_documents (candidate_participant_id, document_type, storage_path) values
     ('00000000-0000-0000-0000-0000000010e1', 'cedula_identidad', '00000000-0000-0000-0000-0000000010e1/cedula.jpg') $$,
  'el propio titular puede subir su documento'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000001001'); -- admin, no es el participante
select throws_ok(
  $$ insert into public.candidate_documents (candidate_participant_id, document_type, storage_path) values
     ('00000000-0000-0000-0000-0000000010e1', 'liquidaciones_sueldo', '00000000-0000-0000-0000-0000000010e1/liquidacion.pdf') $$,
  '42501',
  null,
  'un admin de la organización NO puede subir un documento en nombre del participante'
);
reset role;

-- Visibilidad del documento ya subido: org member sí, outsider no.
select pg_temp.login_as('00000000-0000-0000-0000-000000001001');
select is(
  (select count(*)::int from public.candidate_documents where candidate_participant_id = '00000000-0000-0000-0000-0000000010e1'),
  1,
  'el admin de la org dueña ve el documento que subió el titular'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000001006'); -- outsider
select is(
  (select count(*)::int from public.candidate_documents where candidate_participant_id = '00000000-0000-0000-0000-0000000010e1'),
  0,
  'un outsider no ve ningún documento'
);
reset role;

-- Una vez 'completado', ni el propio dueño puede subir o borrar más.
update public.candidate_participants set status = 'completado' where id = '00000000-0000-0000-0000-0000000010e1';
select pg_temp.login_as('00000000-0000-0000-0000-000000001004');
select throws_ok(
  $$ insert into public.candidate_documents (candidate_participant_id, document_type, storage_path) values
     ('00000000-0000-0000-0000-0000000010e1', 'otro', '00000000-0000-0000-0000-0000000010e1/otro.pdf') $$,
  '42501',
  null,
  'una postulación ya completada no admite más documentos, ni del propio dueño'
);
reset role;

-- ---------------------------------------------------------------------
-- 5) candidate_consents: trazable e inmodificable — el propio dueño
--    puede insertar, pero NADIE puede actualizar ni borrar, porque el
--    GRANT mismo no existe (no es solo una policy).
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000001005'); -- codeudor (participant 10e2), sin vincular user_id todavía
-- El codeudor real todavía no tiene user_id poblado en su fila (nace en
-- la Etapa 2) — para probar el consentimiento como "el propio dueño" acá
-- se usa el titular, que sí está vinculado.
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000001004'); -- titular, vinculado
-- (10e1 ya quedó 'completado' más arriba — is_own_candidate_participant
-- exige status <> completado, así que el consentimiento se prueba
-- ANTES de completar; se reordena: se vuelve a 'en_progreso' para esto.)
reset role;
update public.candidate_participants set status = 'en_progreso' where id = '00000000-0000-0000-0000-0000000010e1';

select pg_temp.login_as('00000000-0000-0000-0000-000000001004');
select lives_ok(
  $$ insert into public.candidate_consents (candidate_participant_id, consent_type, consent_text) values
     ('00000000-0000-0000-0000-0000000010e1', 'informe_comercial', 'Autorizo la consulta de mi informe comercial.') $$,
  'el propio titular puede registrar su consentimiento'
);

select throws_ok(
  $$ update public.candidate_consents set consent_text = 'Cambiado' where candidate_participant_id = '00000000-0000-0000-0000-0000000010e1' $$,
  '42501',
  null,
  'ni el propio dueño puede modificar un consentimiento ya registrado — no hay GRANT de update'
);

select throws_ok(
  $$ delete from public.candidate_consents where candidate_participant_id = '00000000-0000-0000-0000-0000000010e1' $$,
  '42501',
  null,
  'ni el propio dueño puede borrar un consentimiento ya registrado — no hay GRANT de delete'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000001001'); -- admin de la org dueña
select is(
  (select count(*)::int from public.candidate_consents where candidate_participant_id = '00000000-0000-0000-0000-0000000010e1'),
  1,
  'el admin de la organización ve el consentimiento registrado'
);
select throws_ok(
  $$ update public.candidate_consents set consent_text = 'Intento de admin' where candidate_participant_id = '00000000-0000-0000-0000-0000000010e1' $$,
  '42501',
  null,
  'tampoco un admin de organización puede modificar un consentimiento — no hay GRANT de update para nadie'
);
reset role;

-- ---------------------------------------------------------------------
-- 6) Los helpers de acceso son a prueba de basura: una entrada que no
--    matchea ningún id (adversarial o corrupta) devuelve false, nunca
--    lanza una excepción de cast.
-- ---------------------------------------------------------------------
select is(
  public.can_access_candidate_documents('no-es-un-uuid-valido', '00000000-0000-0000-0000-000000001001'),
  false,
  'can_access_candidate_documents con basura como id devuelve false, no lanza'
);
select is(
  public.is_own_candidate_participant('../../etc/passwd', '00000000-0000-0000-0000-000000001004'),
  false,
  'is_own_candidate_participant con una entrada adversarial devuelve false, no lanza'
);

select * from finish();
rollback;
