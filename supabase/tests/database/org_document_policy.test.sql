-- pgTAP suite para la migración 20260830100001 (Evaluación de papeles,
-- Etapa 1 — política de documentos, capas 1 y 2, sin datos personales).
-- Propio rango de UUID: usuarios ...000001101-...000001103, orgs
-- ...0000000011a1/11a2, propiedad ...0000000011c1.

begin;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000001101', 'odp-arrendador@test.local'),  -- admin de la org dueña
  ('00000000-0000-0000-0000-000000001102', 'odp-corredor@test.local'),    -- admin de la corredora delegada
  ('00000000-0000-0000-0000-000000001103', 'odp-outsider@test.local');    -- sin ninguna relación

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000011a1', 'individual', 'Dueña ODP Test', '00000000-0000-0000-0000-000000001101'),
  ('00000000-0000-0000-0000-0000000011a2', 'broker', 'Corredora ODP Test', '00000000-0000-0000-0000-000000001102');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000001101', '00000000-0000-0000-0000-0000000011a1', 'admin'),
  ('00000000-0000-0000-0000-000000001102', '00000000-0000-0000-0000-0000000011a2', 'admin');

insert into public.properties (id, organization_id, broker_organization_id, address) values
  ('00000000-0000-0000-0000-0000000011c1', '00000000-0000-0000-0000-0000000011a1', '00000000-0000-0000-0000-0000000011a2', 'Propiedad ODP Test');

create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- 1) org_document_policy: solo el admin de la organización escribe la
--    suya; cualquier miembro la lee; un outsider no ve nada.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000001101');
select lives_ok(
  $$ insert into public.org_document_policy (organization_id, income_type, document_type, required) values
     ('00000000-0000-0000-0000-0000000011a1', 'dependiente', 'certificado_afp', false) $$,
  'el admin de la organización puede definir su propia política'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000001102'); -- admin de OTRA organización
select throws_ok(
  $$ insert into public.org_document_policy (organization_id, income_type, document_type, required) values
     ('00000000-0000-0000-0000-0000000011a1', 'dependiente', 'contrato_trabajo', false) $$,
  '42501',
  null,
  'el admin de otra organización no puede tocar la política de la primera'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000001103'); -- outsider
select is(
  (select count(*)::int from public.org_document_policy where organization_id = '00000000-0000-0000-0000-0000000011a1'),
  0,
  'un outsider sin ninguna relación no ve la política de nadie'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000001101');
select is(
  (select required from public.org_document_policy where organization_id = '00000000-0000-0000-0000-0000000011a1' and document_type = 'certificado_afp'),
  false,
  'la propia organización lee su override tal como quedó'
);

-- Un segundo insert para la MISMA combinación choca con la unique — el
-- upsert real del server action usará on conflict do update, esto
-- prueba que el candado sigue ahí si alguien no pasa por esa vía.
select throws_ok(
  $$ insert into public.org_document_policy (organization_id, income_type, document_type, required) values
     ('00000000-0000-0000-0000-0000000011a1', 'dependiente', 'certificado_afp', true) $$,
  '23505',
  null,
  'no se puede duplicar la misma combinación organización/ingreso/documento — hace falta upsert'
);
reset role;

-- ---------------------------------------------------------------------
-- 2) property_document_policy: admin de la org dueña O de la corredora
--    delegada puede ajustar; un agente sin permiso de admin no puede;
--    un outsider no ve nada.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000001102'); -- admin de la corredora delegada
select lives_ok(
  $$ insert into public.property_document_policy (property_id, income_type, document_type, required) values
     ('00000000-0000-0000-0000-0000000011c1', 'independiente', 'cartola_bancaria', true) $$,
  'el admin de la corredora delegada puede ajustar la política de esta propiedad'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000001101'); -- admin de la org dueña
select is(
  (select count(*)::int from public.property_document_policy where property_id = '00000000-0000-0000-0000-0000000011c1'),
  1,
  'el admin de la org dueña ve el ajuste que hizo la corredora delegada'
);
select lives_ok(
  $$ update public.property_document_policy set required = false
     where property_id = '00000000-0000-0000-0000-0000000011c1' and document_type = 'cartola_bancaria' $$,
  'el admin de la org dueña también puede modificar el ajuste de su propiedad'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000001103'); -- outsider
select is(
  (select count(*)::int from public.property_document_policy where property_id = '00000000-0000-0000-0000-0000000011c1'),
  0,
  'un outsider no ve el ajuste de la propiedad'
);
select throws_ok(
  $$ insert into public.property_document_policy (property_id, income_type, document_type, required) values
     ('00000000-0000-0000-0000-0000000011c1', 'pensionado', 'informe_comercial', false) $$,
  '42501',
  null,
  'un outsider no puede insertar un ajuste para una propiedad ajena'
);
reset role;

select * from finish();
rollback;
