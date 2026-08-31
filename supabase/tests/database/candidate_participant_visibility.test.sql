-- pgTAP suite para la migración 20260901120001 (Evaluación de papeles,
-- Etapa 3 — el propio participante necesita leer property_candidates,
-- properties y el perfil de quien lo invitó; lagunas encontradas
-- probando el flujo real, no supuestas de antemano). Propio rango de
-- UUID: usuarios ...000001401-...000001403, orgs ...0000000014a1/14a2,
-- propiedad ...0000000014c1, candidatura ...0000000014d1, participante
-- ...0000000014e1.

begin;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000001401', 'cpv-arrendador@test.local'), -- admin de la org dueña, quien invita
  ('00000000-0000-0000-0000-000000001402', 'cpv-titular@test.local'),    -- el propio participante
  ('00000000-0000-0000-0000-000000001403', 'cpv-outsider@test.local');   -- sin ninguna relación

insert into public.profiles (id, full_name) values
  ('00000000-0000-0000-0000-000000001401', 'Arrendador CPV Test')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000014a1', 'individual', 'Dueña CPV Test', '00000000-0000-0000-0000-000000001401');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000001401', '00000000-0000-0000-0000-0000000014a1', 'admin');

insert into public.properties (id, organization_id, address) values
  ('00000000-0000-0000-0000-0000000014c1', '00000000-0000-0000-0000-0000000014a1', 'Propiedad CPV Test');

insert into public.contacts (id, organization_id, contact_role, full_name, email, status, user_id, confirmed_at, created_by) values
  ('00000000-0000-0000-0000-0000000014b1', '00000000-0000-0000-0000-0000000014a1', 'arrendatario', 'Titular CPV Test', 'cpv-titular@test.local', 'confirmado', '00000000-0000-0000-0000-000000001402', now(), '00000000-0000-0000-0000-000000001401');

insert into public.property_candidates (id, property_id, contact_id) values
  ('00000000-0000-0000-0000-0000000014d1', '00000000-0000-0000-0000-0000000014c1', '00000000-0000-0000-0000-0000000014b1');

insert into public.candidate_participants (id, property_candidate_id, participant_type, full_name, email, status, user_id, created_by) values
  ('00000000-0000-0000-0000-0000000014e1', '00000000-0000-0000-0000-0000000014d1', 'titular', 'Titular CPV Test', 'cpv-titular@test.local', 'en_progreso', '00000000-0000-0000-0000-000000001402', '00000000-0000-0000-0000-000000001401');

create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- El propio participante ahora SÍ ve la candidatura, la propiedad, y el
-- perfil de quien lo invitó — antes de esta migración, las tres daban 0.
select pg_temp.login_as('00000000-0000-0000-0000-000000001402');
select is(
  (select count(*)::int from public.property_candidates where id = '00000000-0000-0000-0000-0000000014d1'),
  1,
  'el participante ve la candidatura de su propia postulación'
);
select is(
  (select count(*)::int from public.properties where id = '00000000-0000-0000-0000-0000000014c1'),
  1,
  'el participante ve la propiedad de su propia postulación'
);
select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-000000001401'),
  'Arrendador CPV Test',
  'el participante ve el perfil de quien lo invitó (created_by)'
);
reset role;

-- Sigue sin ver la candidatura/propiedad de un tercero, sin relación.
select pg_temp.login_as('00000000-0000-0000-0000-000000001403'); -- outsider
select is(
  (select count(*)::int from public.property_candidates where id = '00000000-0000-0000-0000-0000000014d1'),
  0,
  'un outsider sin participación no ve la candidatura ajena'
);
select is(
  (select count(*)::int from public.properties where id = '00000000-0000-0000-0000-0000000014c1'),
  0,
  'un outsider sin participación no ve la propiedad ajena'
);
select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-000000001401'),
  0,
  'un outsider tampoco ve el perfil de quien invitó a otra persona'
);
reset role;

-- El admin de la organización (ya lo veía antes, por is_org_member) lo
-- sigue viendo — esto solo amplió visibilidad, no la restó.
select pg_temp.login_as('00000000-0000-0000-0000-000000001401');
select is(
  (select count(*)::int from public.property_candidates where id = '00000000-0000-0000-0000-0000000014d1'),
  1,
  'el admin de la organización sigue viendo la candidatura, como antes'
);
select is(
  (select count(*)::int from public.properties where id = '00000000-0000-0000-0000-0000000014c1'),
  1,
  'el admin de la organización sigue viendo la propiedad, como antes'
);
reset role;

select * from finish();
rollback;
