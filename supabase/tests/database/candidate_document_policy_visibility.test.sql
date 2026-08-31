-- pgTAP suite para la migración 20260901130001 (Evaluación de papeles,
-- Etapa 4 — el propio candidato necesita leer org_document_policy y
-- property_document_policy de su propia postulación, para derivar su
-- lista de documentos). Propio rango de UUID: usuarios
-- ...000001501-...000001503, org ...0000000015a1, propiedad
-- ...0000000015c1, candidatura ...0000000015d1, participante
-- ...0000000015e1.

begin;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000001501', 'cdpv-admin@test.local'),    -- admin de la org dueña
  ('00000000-0000-0000-0000-000000001502', 'cdpv-titular@test.local'),  -- el propio participante
  ('00000000-0000-0000-0000-000000001503', 'cdpv-outsider@test.local'); -- sin ninguna relación

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000015a1', 'individual', 'Dueña CDPV Test', '00000000-0000-0000-0000-000000001501');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000001501', '00000000-0000-0000-0000-0000000015a1', 'admin');

insert into public.properties (id, organization_id, address) values
  ('00000000-0000-0000-0000-0000000015c1', '00000000-0000-0000-0000-0000000015a1', 'Propiedad CDPV Test');

insert into public.contacts (id, organization_id, contact_role, full_name, email, status, user_id, confirmed_at, created_by) values
  ('00000000-0000-0000-0000-0000000015b1', '00000000-0000-0000-0000-0000000015a1', 'arrendatario', 'Titular CDPV Test', 'cdpv-titular@test.local', 'confirmado', '00000000-0000-0000-0000-000000001502', now(), '00000000-0000-0000-0000-000000001501');

insert into public.property_candidates (id, property_id, contact_id) values
  ('00000000-0000-0000-0000-0000000015d1', '00000000-0000-0000-0000-0000000015c1', '00000000-0000-0000-0000-0000000015b1');

insert into public.candidate_participants (id, property_candidate_id, participant_type, full_name, email, status, user_id, created_by) values
  ('00000000-0000-0000-0000-0000000015e1', '00000000-0000-0000-0000-0000000015d1', 'titular', 'Titular CDPV Test', 'cdpv-titular@test.local', 'en_progreso', '00000000-0000-0000-0000-000000001502', '00000000-0000-0000-0000-000000001501');

insert into public.org_document_policy (organization_id, income_type, document_type, required) values
  ('00000000-0000-0000-0000-0000000015a1', 'dependiente', 'liquidaciones_sueldo', true);

insert into public.property_document_policy (property_id, income_type, document_type, required) values
  ('00000000-0000-0000-0000-0000000015c1', 'dependiente', 'cartola_bancaria', true);

create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- El propio participante ahora SÍ ve la política de org y de propiedad
-- de su propia postulación — antes de esta migración, las dos daban 0.
select pg_temp.login_as('00000000-0000-0000-0000-000000001502');
select is(
  (select count(*)::int from public.org_document_policy where organization_id = '00000000-0000-0000-0000-0000000015a1'),
  1,
  'el participante ve la política de org de su propia postulación'
);
select is(
  (select count(*)::int from public.property_document_policy where property_id = '00000000-0000-0000-0000-0000000015c1'),
  1,
  'el participante ve la política de propiedad de su propia postulación'
);
reset role;

-- Sigue sin ver la política de una organización/propiedad ajena.
select pg_temp.login_as('00000000-0000-0000-0000-000000001503'); -- outsider
select is(
  (select count(*)::int from public.org_document_policy where organization_id = '00000000-0000-0000-0000-0000000015a1'),
  0,
  'un outsider sin participación no ve la política de org ajena'
);
select is(
  (select count(*)::int from public.property_document_policy where property_id = '00000000-0000-0000-0000-0000000015c1'),
  0,
  'un outsider sin participación no ve la política de propiedad ajena'
);
reset role;

-- El admin de la organización (ya la veía antes, por is_org_member) la
-- sigue viendo — esto solo amplió visibilidad, no la restó.
select pg_temp.login_as('00000000-0000-0000-0000-000000001501');
select is(
  (select count(*)::int from public.org_document_policy where organization_id = '00000000-0000-0000-0000-0000000015a1'),
  1,
  'el admin de la organización sigue viendo su propia política de org'
);
select is(
  (select count(*)::int from public.property_document_policy where property_id = '00000000-0000-0000-0000-0000000015c1'),
  1,
  'el admin de la organización sigue viendo la política de propiedad'
);
reset role;

select * from finish();
rollback;
