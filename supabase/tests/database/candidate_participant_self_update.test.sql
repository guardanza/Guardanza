-- pgTAP suite para la migración 20260901110001 (Evaluación de papeles,
-- Etapa 3 — el propio participante ahora puede guardar su identidad y
-- tipo de ingreso). Propio rango de UUID: usuarios ...000001301-
-- ...000001303, orgs ...0000000013a1/13a2, propiedad ...0000000013c1,
-- candidatura ...0000000013d1, participante ...0000000013e1.

begin;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000001301', 'csu-arrendador@test.local'), -- admin de la org dueña
  ('00000000-0000-0000-0000-000000001302', 'csu-titular@test.local'),    -- el propio participante
  ('00000000-0000-0000-0000-000000001303', 'csu-outsider@test.local');   -- sin ninguna relación

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000013a1', 'individual', 'Dueña CSU Test', '00000000-0000-0000-0000-000000001301');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000001301', '00000000-0000-0000-0000-0000000013a1', 'admin');

insert into public.properties (id, organization_id, address) values
  ('00000000-0000-0000-0000-0000000013c1', '00000000-0000-0000-0000-0000000013a1', 'Propiedad CSU Test');

insert into public.contacts (id, organization_id, contact_role, full_name, email, status, user_id, confirmed_at, created_by) values
  ('00000000-0000-0000-0000-0000000013b1', '00000000-0000-0000-0000-0000000013a1', 'arrendatario', 'Titular CSU Test', 'csu-titular@test.local', 'confirmado', '00000000-0000-0000-0000-000000001302', now(), '00000000-0000-0000-0000-000000001301');

insert into public.property_candidates (id, property_id, contact_id) values
  ('00000000-0000-0000-0000-0000000013d1', '00000000-0000-0000-0000-0000000013c1', '00000000-0000-0000-0000-0000000013b1');

insert into public.candidate_participants (id, property_candidate_id, participant_type, full_name, email, status, user_id, created_by) values
  ('00000000-0000-0000-0000-0000000013e1', '00000000-0000-0000-0000-0000000013d1', 'titular', 'Titular CSU Test', 'csu-titular@test.local', 'en_progreso', '00000000-0000-0000-0000-000000001302', '00000000-0000-0000-0000-000000001301');

create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- El propio participante SÍ puede guardar su identidad y tipo de ingreso.
select pg_temp.login_as('00000000-0000-0000-0000-000000001302');
select lives_ok(
  $$ update public.candidate_participants set identity_doc_type = 'cedula_chilena', rut = '11.111.111-1'
     where id = '00000000-0000-0000-0000-0000000013e1' $$,
  'el propio participante puede guardar su tipo de documento de identidad'
);
select lives_ok(
  $$ update public.candidate_participants set income_type = 'dependiente'
     where id = '00000000-0000-0000-0000-0000000013e1' $$,
  'el propio participante puede guardar su tipo de ingreso'
);
select is(
  (select income_type::text from public.candidate_participants where id = '00000000-0000-0000-0000-0000000013e1'),
  'dependiente',
  'el valor quedó guardado de verdad'
);

-- Pero ni el propio participante puede forzar 'completado' con una
-- UPDATE cruda — mismo candado de defensa en profundidad de la Etapa 0.
select throws_ok(
  $$ update public.candidate_participants set status = 'completado' where id = '00000000-0000-0000-0000-0000000013e1' $$,
  '42501',
  null,
  'ni el propio participante puede forzar completado con una UPDATE directa'
);
reset role;

-- El admin de la organización sigue pudiendo escribir (no se le quitó
-- nada al extender la policy).
select pg_temp.login_as('00000000-0000-0000-0000-000000001301');
select lives_ok(
  $$ update public.candidate_participants set full_name = 'Titular CSU Test (corregido)' where id = '00000000-0000-0000-0000-0000000013e1' $$,
  'el admin de la organización sigue pudiendo escribir, como antes'
);
reset role;

-- Un outsider sin relación no puede tocar nada — la USING clause
-- simplemente no matchea ninguna fila (0 rows, sin error, no hay
-- policy de UPDATE para él acá), así que se verifica que el valor
-- sigue intacto, no que la sentencia lance.
select pg_temp.login_as('00000000-0000-0000-0000-000000001303');
update public.candidate_participants set income_type = 'independiente' where id = '00000000-0000-0000-0000-0000000013e1';
reset role;
select is(
  (select income_type::text from public.candidate_participants where id = '00000000-0000-0000-0000-0000000013e1'),
  'dependiente',
  'un outsider sin relación no puede tocar la fila de otra persona (0 filas afectadas, valor intacto)'
);

select * from finish();
rollback;
