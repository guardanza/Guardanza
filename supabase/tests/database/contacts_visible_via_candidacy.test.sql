-- pgTAP suite para el fix de contacts_select_via_candidacy: encontrado en
-- la verificación del paso 5 de Tanda D (el arrendador no podía ver el
-- nombre de un candidato que el corredor agregó desde SU propia
-- libreta). Cobertura mínima y puntual — el resto de contacts_select ya
-- está cubierto en contacts.test.sql, esto solo prueba la ampliación
-- nueva. Propio rango de UUID (...000960-...000963 usuarios,
-- ...0000009c1-...0000009c2 orgs) para no pisar otros archivos.

begin;
select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000960', 'cvc-landlord@test.local'),   -- admin de la org dueña
  ('00000000-0000-0000-0000-000000000961', 'cvc-corredor@test.local'),   -- admin de la corredora, dueño del contacto
  ('00000000-0000-0000-0000-000000000962', 'cvc-candidato@test.local'),  -- el contacto candidato en sí
  ('00000000-0000-0000-0000-000000000963', 'cvc-outsider@test.local');   -- sin ninguna relación

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000009c1', 'individual', 'Dueña CVC Test', '00000000-0000-0000-0000-000000000960'),
  ('00000000-0000-0000-0000-0000000009c2', 'broker', 'Corredora CVC Test', '00000000-0000-0000-0000-000000000961');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000000960', '00000000-0000-0000-0000-0000000009c1', 'admin'),
  ('00000000-0000-0000-0000-000000000961', '00000000-0000-0000-0000-0000000009c2', 'admin');

insert into public.properties (id, organization_id, broker_organization_id, address) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000009c1', '00000000-0000-0000-0000-0000000009c2', 'Propiedad CVC Test');

-- Contacto cargado por el CORREDOR, en SU propia libreta (organization_id = corredora)
insert into public.contacts (id, organization_id, contact_role, full_name, email, status, user_id, created_by) values
  ('00000000-0000-0000-0000-00000000091f', '00000000-0000-0000-0000-0000000009c2', 'arrendatario', 'Candidato Cruzado CVC', 'cvc-candidato@test.local', 'confirmado', '00000000-0000-0000-0000-000000000962', '00000000-0000-0000-0000-000000000961');

insert into public.property_candidates (property_id, contact_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000091f');

create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- El ARRENDADOR (org dueña, no la corredora que cargó el contacto) SÍ ve el nombre.
select pg_temp.login_as('00000000-0000-0000-0000-000000000960');
select is(
  (select full_name from public.contacts where id = '00000000-0000-0000-0000-00000000091f'),
  'Candidato Cruzado CVC',
  'el arrendador ve el nombre de un candidato que el corredor cargó desde su propia libreta'
);
reset role;

-- El propio CORREDOR (dueño del contacto) sigue viéndolo, sin cambios.
select pg_temp.login_as('00000000-0000-0000-0000-000000000961');
select is(
  (select full_name from public.contacts where id = '00000000-0000-0000-0000-00000000091f'),
  'Candidato Cruzado CVC',
  'el corredor (dueño del contacto) lo sigue viendo con normalidad'
);
reset role;

-- Un outsider sin ninguna relación con la propiedad NO lo ve.
select pg_temp.login_as('00000000-0000-0000-0000-000000000963');
select is(
  (select count(*)::int from public.contacts where id = '00000000-0000-0000-0000-00000000091f'),
  0,
  'un outsider sin relación con la propiedad no ve el contacto'
);
reset role;

-- La ampliación es SOLO vía candidatura -- un contacto de la corredora
-- que nunca se agregó como candidato a ninguna propiedad en común sigue
-- siendo invisible para el arrendador.
insert into public.contacts (id, organization_id, contact_role, full_name, email, status, created_by) values
  ('00000000-0000-0000-0000-000000000920', '00000000-0000-0000-0000-0000000009c2', 'arrendatario', 'Sin Candidatura CVC', 'cvc-sin-candidatura@test.local', 'pendiente', '00000000-0000-0000-0000-000000000961');

select pg_temp.login_as('00000000-0000-0000-0000-000000000960');
select is(
  (select count(*)::int from public.contacts where id = '00000000-0000-0000-0000-000000000920'),
  0,
  'un contacto de la corredora que nunca fue candidato a una propiedad en común sigue sin verse'
);
reset role;

select * from finish();
rollback;
