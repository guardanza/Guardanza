-- pgTAP suite for the "una cuenta administra una sola organización"
-- restriction (20260731170001): the partial unique index on
-- memberships(user_id) where role='admin', and create_organization()'s
-- new guard. Same impersonation pattern as the other suites, own UUID
-- range (...000601-...000606, ...0000006a1-...0000006a3).

begin;
select plan(8);

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000601', 'oneorg-fresh@test.local'),        -- zero memberships
  ('00000000-0000-0000-0000-000000000602', 'oneorg-already-admin@test.local'), -- ya admin de una org
  ('00000000-0000-0000-0000-000000000603', 'oneorg-agente-only@test.local'),  -- solo membership no-admin
  ('00000000-0000-0000-0000-000000000604', 'oneorg-platadmin-fresh@test.local'),
  ('00000000-0000-0000-0000-000000000605', 'oneorg-platadmin-already@test.local'),
  ('00000000-0000-0000-0000-000000000606', 'oneorg-role-switch@test.local');

update public.profiles set is_platform_admin = true where id in (
  '00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000605'
);

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000006a1', 'individual', 'Ya Admin Org', '00000000-0000-0000-0000-000000000602'),
  ('00000000-0000-0000-0000-0000000006a2', 'broker', 'Agente Only Org', '00000000-0000-0000-0000-000000000601'),
  ('00000000-0000-0000-0000-0000000006a3', 'broker', 'Platadmin Already Org', '00000000-0000-0000-0000-000000000605');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-0000000006a1', 'admin'),
  ('00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-0000000006a2', 'agente'),
  ('00000000-0000-0000-0000-000000000605', '00000000-0000-0000-0000-0000000006a3', 'admin');

create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- El índice único parcial es el candado real, no solo el guard de la
-- función: un insert directo a memberships (bypaseando create_organization
-- por completo) para un usuario que ya administra una organización debe
-- fallar igual.
-- ---------------------------------------------------------------------
select throws_ok(
  $$ insert into public.memberships (user_id, organization_id, role) values
     ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-0000000006a2', 'admin') $$,
  '23505',
  null,
  'el índice único bloquea una segunda membership admin aunque se inserte directo, sin pasar por create_organization'
);

-- Una segunda membership NO-admin (agente) para alguien que ya es admin
-- de otra organización sí debe poder insertarse — el índice es parcial,
-- solo mira role='admin'.
select lives_ok(
  $$ insert into public.memberships (user_id, organization_id, role) values
     ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-0000000006a2', 'agente') $$,
  'una membership no-admin adicional para alguien que ya es admin en otro lado no choca con el índice'
);
delete from public.memberships where user_id = '00000000-0000-0000-0000-000000000602' and role = 'agente';

-- (Un usuario sin ninguna membership y no platform admin sigue bloqueado
-- por el guard preexistente de Fase 0 — "Debes solicitar un cambio de
-- rol" — antes de siquiera llegar al guard nuevo; eso ya lo cubre
-- role_change.test.sql, no se repite acá.)

-- ---------------------------------------------------------------------
-- create_organization(): quien ya administra una organización no puede
-- crear una segunda — el guard explícito de la función.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000602');
select throws_ok(
  $$ select public.create_organization('broker', 'Segunda Org No Permitida') $$,
  'P0001', null,
  'quien ya administra una organización no puede crear una segunda'
);
reset role;

-- ---------------------------------------------------------------------
-- create_organization(): alguien con SOLO una membership no-admin
-- (agente) sigue pudiendo crear su propia organización — no tiene
-- ninguna organización que administre todavía.
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000603');
select lives_ok(
  $$ select public.create_organization('individual', 'Org De Quien Solo Era Agente') $$,
  'ser agente (no-admin) de una organización no impide crear la propia'
);
reset role;

-- ---------------------------------------------------------------------
-- Platform admin: sigue exento de la regla "hace falta al menos una
-- organización" (comportamiento preexistente, sin cambios) — pero NO
-- exento de "como mucho una" (regla nueva, deliberadamente uniforme).
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000604');
select lives_ok(
  $$ select public.create_organization('broker', 'Primera Org De Platadmin') $$,
  'un platform admin sin ninguna organización todavía puede crear la primera'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-000000000605');
select throws_ok(
  $$ select public.create_organization('individual', 'Segunda Org De Platadmin') $$,
  'P0001', null,
  'un platform admin que ya administra una organización tampoco puede crear una segunda'
);
reset role;

-- ---------------------------------------------------------------------
-- ejecutar_cambio_rol sigue funcionando: transición arrendador->corredor
-- (delete de la membership vieja, insert de la nueva, misma transacción)
-- no choca con el índice nuevo. Se llama a través de
-- cambiar_rol_admin_directo — ejecutar_cambio_rol no tiene grant execute
-- a authenticated a propósito, solo se llama desde sus wrappers.
-- ---------------------------------------------------------------------
update public.profiles set is_platform_admin = true where id = '00000000-0000-0000-0000-000000000601';
insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000006a4', 'individual', 'Org De Role Switch', '00000000-0000-0000-0000-000000000606');
insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000000606', '00000000-0000-0000-0000-0000000006a4', 'admin');

select pg_temp.login_as('00000000-0000-0000-0000-000000000601'); -- ahora sí, platform admin
select lives_ok(
  $$ select public.cambiar_rol_admin_directo(
       '00000000-0000-0000-0000-000000000606', 'corredor', 'test', 'Nueva Corredora De Role Switch', '11.111.111-1', 'persona_natural'
     ) $$,
  'cambiar_rol_admin_directo (borra la membership vieja e inserta la nueva) sigue funcionando con el índice nuevo'
);
reset role;

select is(
  (select count(*)::int from public.memberships where user_id = '00000000-0000-0000-0000-000000000606' and role = 'admin'),
  1,
  'tras el cambio de rol, la cuenta queda con exactamente una membership admin, no dos'
);

select * from finish();
rollback;
