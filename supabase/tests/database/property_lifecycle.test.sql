-- pgTAP suite para el rediseño de estados de propiedad (Paso 5/6 del
-- diagnóstico: la restricción de inactivar). Cubre las tres categorías
-- acordadas con el usuario: nada vivo (permite inactivar), contrato en
-- proceso (bloquea con 'contract_in_progress'), garantía en custodia
-- (bloquea con 'guarantee_in_custody') — más autorización y el camino de
-- reactivar. Propio rango de UUID (...960-...966 usuarios, ...09c1-09c4
-- orgs, ...00b1-00b6 propiedades, ...00c1-00c3 contratos) para no pisar
-- otros archivos.

begin;
select plan(10);

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000960', 'pl-admin@test.local'),   -- admin de la org dueña, usa las funciones
  ('00000000-0000-0000-0000-000000000961', 'pl-outsider@test.local'); -- sin ninguna membership sobre estas propiedades

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000009c1', 'individual', 'Dueña PL Test', '00000000-0000-0000-0000-000000000960');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000000960', '00000000-0000-0000-0000-0000000009c1', 'admin');

-- b1: sin contrato -- se puede inactivar y después reactivar.
-- b2: contrato cancelado -- no cuenta como vivo, se puede inactivar.
-- b3: contrato finalizado -- tampoco cuenta como vivo, se puede inactivar.
-- b4: contrato pendiente_firma_arrendador -- "en proceso", bloquea.
-- b5: contrato activo con garantía en_custodia -- bloquea con el otro mensaje.
-- b6: ya activa, para probar que reactivar una propiedad que no está inactiva falla.
insert into public.properties (id, organization_id, address, status) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000009c1', 'Propiedad PL Sin Contrato', 'activa'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000009c1', 'Propiedad PL Cancelado', 'activa'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000009c1', 'Propiedad PL Finalizado', 'activa'),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000009c1', 'Propiedad PL En Proceso', 'activa'),
  ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-0000000009c1', 'Propiedad PL En Custodia', 'activa'),
  ('00000000-0000-0000-0000-0000000000b6', '00000000-0000-0000-0000-0000000009c1', 'Propiedad PL Ya Activa', 'activa');

insert into public.contracts (id, property_id, status, start_date, end_date, rent_amount, rent_currency, guarantee_currency, guarantee_amount) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'cancelado', '2026-01-01', '2027-01-01', 500000, 'CLP', 'CLP', 500000),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b3', 'finalizado', '2026-01-01', '2027-01-01', 500000, 'CLP', 'CLP', 500000),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b4', 'pendiente_firma_arrendador', '2026-01-01', '2027-01-01', 500000, 'CLP', 'CLP', 500000),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000b5', 'activo', '2026-01-01', '2027-01-01', 500000, 'CLP', 'CLP', 500000);

-- La garantía de b5 se crea sola (trigger contracts_create_guarantee) en
-- 'pendiente' -- se sube a 'en_custodia' a mano acá, mismo estado que
-- deja pay_guarantee() en el camino real.
update public.guarantees set status = 'en_custodia' where contract_id = '00000000-0000-0000-0000-0000000000c4';

create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- Nada vivo: sin contrato -- se puede inactivar.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000960');
select is(
  (select status::text from public.set_property_inactive('00000000-0000-0000-0000-0000000000b1')),
  'inactiva',
  'sin contrato: se puede marcar inactiva'
);

-- Reactivar esa misma propiedad -- vuelve a activa.
select is(
  (select status::text from public.set_property_active('00000000-0000-0000-0000-0000000000b1')),
  'activa',
  'una propiedad inactiva se puede reactivar'
);

-- Reactivar una que NO está inactiva (b6, sigue activa) -- falla.
select throws_ok(
  $$ select public.set_property_active('00000000-0000-0000-0000-0000000000b6') $$,
  'P0001',
  null,
  'no se puede "reactivar" una propiedad que ya está activa'
);

-- ---------------------------------------------------------------------
-- Contrato cancelado: no cuenta como vivo -- se puede inactivar.
-- ---------------------------------------------------------------------
select is(
  (select status::text from public.set_property_inactive('00000000-0000-0000-0000-0000000000b2')),
  'inactiva',
  'contrato cancelado no cuenta como vivo: se puede marcar inactiva'
);

-- ---------------------------------------------------------------------
-- Contrato finalizado: tampoco cuenta como vivo -- se puede inactivar.
-- ---------------------------------------------------------------------
select is(
  (select status::text from public.set_property_inactive('00000000-0000-0000-0000-0000000000b3')),
  'inactiva',
  'contrato finalizado no cuenta como vivo: se puede marcar inactiva'
);

-- ---------------------------------------------------------------------
-- Contrato en proceso (pendiente_firma_arrendador): bloquea.
-- ---------------------------------------------------------------------
select throws_ok(
  $$ select public.set_property_inactive('00000000-0000-0000-0000-0000000000b4') $$,
  'P0001',
  'contract_in_progress',
  'un contrato en proceso bloquea marcar la propiedad inactiva'
);

-- Sigue activa después del intento fallido -- el bloqueo no dejó nada a medias.
select is(
  (select status::text from public.properties where id = '00000000-0000-0000-0000-0000000000b4'),
  'activa',
  'el intento bloqueado no cambió el estado de la propiedad'
);

-- ---------------------------------------------------------------------
-- Garantía en custodia (contrato activo): bloquea con el otro mensaje.
-- ---------------------------------------------------------------------
select throws_ok(
  $$ select public.set_property_inactive('00000000-0000-0000-0000-0000000000b5') $$,
  'P0001',
  'guarantee_in_custody',
  'una garantía en custodia bloquea marcar la propiedad inactiva, con mensaje distinto al de "en proceso"'
);
reset role;

-- ---------------------------------------------------------------------
-- Autorización: un outsider sin membership no puede tocar el estado.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000961');
select throws_ok(
  $$ select public.set_property_inactive('00000000-0000-0000-0000-0000000000b6') $$,
  'P0001',
  null,
  'un outsider sin membership no puede marcar inactiva una propiedad ajena'
);
select throws_ok(
  $$ select public.set_property_active('00000000-0000-0000-0000-0000000000b1') $$,
  'P0001',
  null,
  'un outsider sin membership no puede reactivar una propiedad ajena'
);
reset role;

select * from finish();
rollback;
