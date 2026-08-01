-- pgTAP suite for Tanda B Paso 6.5: search_broker_organizations, la
-- primera búsqueda abierta del sistema (no acotada a tu propia órbita de
-- organización/contrato). Cobertura centrada en el punto crítico:
-- devuelve ÚNICAMENTE nombre+RUT+código de la corredora, nunca datos de
-- las personas que trabajan ahí, y nunca organizaciones individual. Same
-- impersonation pattern as the other suites, own UUID range
-- (...000701-...000703, ...0000007a1-...0000007a3).

begin;
select plan(10);

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000701', 'search-broker-admin@test.local'), -- admin de la corredora buscada
  ('00000000-0000-0000-0000-000000000702', 'search-broker-agente@test.local'), -- agente de la misma corredora
  ('00000000-0000-0000-0000-000000000703', 'search-outsider@test.local');     -- no pertenece a ninguna organización

update public.profiles set full_name = 'Nombre Privado Del Admin' where id = '00000000-0000-0000-0000-000000000701';
update public.profiles set full_name = 'Nombre Privado Del Agente' where id = '00000000-0000-0000-0000-000000000702';

insert into public.organizations (id, type, name, rut, created_by) values
  ('00000000-0000-0000-0000-0000000007a1', 'broker', 'Corredora Los Alerces SpA', '76.111.222-3', '00000000-0000-0000-0000-000000000701'),
  ('00000000-0000-0000-0000-0000000007a2', 'individual', 'Corredora Individual Trampa', null, '00000000-0000-0000-0000-000000000701');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-0000000007a1', 'admin'),
  ('00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-0000000007a1', 'agente');

create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- Estructura del retorno: exactamente 4 columnas, ninguna de profiles ni
-- memberships. Se prueba contra el catálogo de Postgres, no confiando en
-- que nadie agregue una columna de más sin querer más adelante.
-- ---------------------------------------------------------------------
select is(
  (
    select array_agg(parameter_name::text order by ordinal_position)
    from information_schema.parameters
    where specific_schema = 'public'
      and parameter_mode = 'OUT'
      and specific_name in (
        select specific_name from information_schema.routines where routine_name = 'search_broker_organizations'
      )
  ),
  array['id', 'name', 'rut', 'org_code'],
  'search_broker_organizations devuelve exactamente id, name, rut, org_code — nada más'
);

-- ---------------------------------------------------------------------
-- Búsqueda abierta: un outsider total (sin ninguna membership) puede
-- buscar y encontrar la corredora — es la garantía de que es de verdad
-- una búsqueda que mira fuera de tu propia órbita.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000703');
select is(
  (select o.name from public.search_broker_organizations('Corredora Los') o),
  'Corredora Los Alerces SpA',
  'un outsider total, sin ninguna membership, puede buscar y encontrar la corredora por nombre'
);
select is(
  (select o.rut from public.search_broker_organizations('76.111') o),
  '76.111.222-3',
  'la misma corredora también se encuentra buscando por prefijo de RUT'
);
reset role;

-- ---------------------------------------------------------------------
-- Nunca organizaciones individual, aunque el nombre matchee el prefijo.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000703');
select is_empty(
  $$ select 1 from public.search_broker_organizations('Corredora Individual') $$,
  'una organización individual nunca aparece, aunque su nombre matchee el prefijo'
);
reset role;

-- ---------------------------------------------------------------------
-- Prefijo mínimo: sin al menos 2 caracteres reales, no lista nada — evita
-- un volcado del directorio completo con una búsqueda vacía o de 1 letra.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000703');
select is_empty(
  $$ select 1 from public.search_broker_organizations('') $$,
  'un prefijo vacío no devuelve nada'
);
select is_empty(
  $$ select 1 from public.search_broker_organizations('C') $$,
  'un prefijo de un solo caracter no devuelve nada'
);
reset role;

-- ---------------------------------------------------------------------
-- Caracteres especiales de ILIKE (%, _) se despojan server-side — un
-- prefijo que es solo "%" no debe listar todo.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000703');
select is_empty(
  $$ select 1 from public.search_broker_organizations('%') $$,
  'un prefijo que es solo el comodín % no lista todas las corredoras'
);
select is(
  (select o.name from public.search_broker_organizations('Corredora Lo%s') o),
  'Corredora Los Alerces SpA',
  'un % en medio del prefijo se despoja y la búsqueda sigue matcheando por prefijo literal'
);
reset role;

-- ---------------------------------------------------------------------
-- Límite de resultados: nunca más de 20 filas, aunque haya más corredoras
-- que matcheen.
-- ---------------------------------------------------------------------
insert into public.organizations (type, name, created_by)
  select 'broker', 'Corredora Limite ' || g, '00000000-0000-0000-0000-000000000701'
  from generate_series(1, 25) g;

select pg_temp.login_as('00000000-0000-0000-0000-000000000703');
select cmp_ok(
  (select count(*)::int from public.search_broker_organizations('Corredora Limite')),
  '<=',
  20,
  'la búsqueda nunca devuelve más de 20 resultados, aunque haya más corredoras que matcheen'
);
reset role;

-- ---------------------------------------------------------------------
-- Cualquier usuario autenticado puede llamarla (grant a authenticated,
-- no restringido a admins/miembros).
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000702'); -- agente, no admin
select lives_ok(
  $$ select public.search_broker_organizations('Corredora Los') $$,
  'cualquier usuario autenticado, no solo admins, puede usar el buscador'
);
reset role;

select * from finish();
rollback;
