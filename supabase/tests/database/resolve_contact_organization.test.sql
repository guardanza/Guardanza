-- pgTAP suite for Tanda B Paso 6.1: resolve_contact_organization, the
-- persona→organización bridge behind the unified contacts view. Same
-- impersonation pattern as the other suites, own UUID range
-- (...000401-...000409, ...0000004a1-...0000004a4).

begin;
select plan(12);

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000401', 'resolve-libreta-admin@test.local'),   -- Org A admin, the "buscador"
  ('00000000-0000-0000-0000-000000000402', 'resolve-libreta-member@test.local'),  -- Org A non-admin member
  ('00000000-0000-0000-0000-000000000403', 'resolve-arrendador@test.local'),      -- confirmed arrendador contact
  ('00000000-0000-0000-0000-000000000404', 'resolve-corredor@test.local'),        -- confirmed corredor contact
  ('00000000-0000-0000-0000-000000000405', 'resolve-arrendatario@test.local'),    -- confirmed arrendatario contact
  ('00000000-0000-0000-0000-000000000406', 'resolve-pendiente@test.local'),       -- not linked to any account (pendiente)
  ('00000000-0000-0000-0000-000000000407', 'resolve-multi-org@test.local'),       -- admin of two individual orgs
  ('00000000-0000-0000-0000-000000000408', 'resolve-outsider-admin@test.local'),  -- Org Ajena admin
  ('00000000-0000-0000-0000-000000000409', 'resolve-agente-only@test.local');     -- non-admin membership only

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000004a1', 'individual', 'Org A (libreta)', '00000000-0000-0000-0000-000000000401'),
  ('00000000-0000-0000-0000-0000000004a2', 'individual', 'Org Arrendador Resuelto', '00000000-0000-0000-0000-000000000403'),
  ('00000000-0000-0000-0000-0000000004a3', 'broker', 'Org Corredor Resuelto', '00000000-0000-0000-0000-000000000404'),
  ('00000000-0000-0000-0000-0000000004a4', 'individual', 'Org Ajena', '00000000-0000-0000-0000-000000000408'),
  ('00000000-0000-0000-0000-0000000004a5', 'individual', 'Org Multi 1 (más antigua)', '00000000-0000-0000-0000-000000000407'),
  ('00000000-0000-0000-0000-0000000004a6', 'individual', 'Org Multi 2 (más nueva)', '00000000-0000-0000-0000-000000000407'),
  ('00000000-0000-0000-0000-0000000004a7', 'broker', 'Org Agente Only', '00000000-0000-0000-0000-000000000401');

insert into public.memberships (user_id, organization_id, role, created_at) values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-0000000004a1', 'admin', now()),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-0000000004a1', 'agente', now()),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-0000000004a2', 'admin', now()),
  ('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-0000000004a3', 'admin', now()),
  ('00000000-0000-0000-0000-000000000408', '00000000-0000-0000-0000-0000000004a4', 'admin', now()),
  ('00000000-0000-0000-0000-000000000407', '00000000-0000-0000-0000-0000000004a5', 'admin', now() - interval '2 days'),
  ('00000000-0000-0000-0000-000000000407', '00000000-0000-0000-0000-0000000004a6', 'admin', now()),
  ('00000000-0000-0000-0000-000000000409', '00000000-0000-0000-0000-0000000004a7', 'agente', now());

-- Org A's libreta: everyone loaded and confirmed except 'resolve-pendiente'.
insert into public.contacts (id, organization_id, contact_role, full_name, email, status, user_id, created_by) values
  ('00000000-0000-0000-0000-0000000004b1', '00000000-0000-0000-0000-0000000004a1', 'arrendador', 'Arrendador Resuelto', 'resolve-arrendador@test.local', 'confirmado', '00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000401'),
  ('00000000-0000-0000-0000-0000000004b2', '00000000-0000-0000-0000-0000000004a1', 'corredor', 'Corredor Resuelto', 'resolve-corredor@test.local', 'confirmado', '00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000401'),
  ('00000000-0000-0000-0000-0000000004b3', '00000000-0000-0000-0000-0000000004a1', 'arrendatario', 'Arrendatario Resuelto', 'resolve-arrendatario@test.local', 'confirmado', '00000000-0000-0000-0000-000000000405', '00000000-0000-0000-0000-000000000401'),
  ('00000000-0000-0000-0000-0000000004b4', '00000000-0000-0000-0000-0000000004a1', 'arrendador', 'Pendiente Sin Confirmar', 'resolve-pendiente@test.local', 'pendiente', null, '00000000-0000-0000-0000-000000000401'),
  ('00000000-0000-0000-0000-0000000004b5', '00000000-0000-0000-0000-0000000004a1', 'arrendador', 'Multi Org', 'resolve-multi-org@test.local', 'confirmado', '00000000-0000-0000-0000-000000000407', '00000000-0000-0000-0000-000000000401'),
  ('00000000-0000-0000-0000-0000000004b6', '00000000-0000-0000-0000-0000000004a1', 'corredor', 'Agente Only Sin Admin', 'resolve-agente-only@test.local', 'confirmado', '00000000-0000-0000-0000-000000000409', '00000000-0000-0000-0000-000000000401');

-- Org Ajena's own libreta, with the SAME confirmed arrendador contact —
-- to prove visibility is scoped per-libreta, not just per-contact-row.
insert into public.contacts (id, organization_id, contact_role, full_name, email, status, user_id, created_by) values
  ('00000000-0000-0000-0000-0000000004c1', '00000000-0000-0000-0000-0000000004a4', 'arrendador', 'Arrendador Resuelto (visto desde otra libreta)', 'resolve-arrendador@test.local', 'confirmado', '00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000408');

create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- Resolución exitosa: arrendador confirmado → su organización individual
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000401');
select is(
  (select o.id from public.resolve_contact_organization('00000000-0000-0000-0000-0000000004b1') o),
  '00000000-0000-0000-0000-0000000004a2'::uuid,
  'un contacto arrendador confirmado resuelve a su organización individual'
);
select is(
  (select o.type from public.resolve_contact_organization('00000000-0000-0000-0000-0000000004b1') o),
  'individual'::public.org_type,
  'el tipo resuelto para un arrendador es individual'
);
reset role;

-- ---------------------------------------------------------------------
-- Resolución exitosa: corredor confirmado → su organización broker
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000401');
select is(
  (select o.id from public.resolve_contact_organization('00000000-0000-0000-0000-0000000004b2') o),
  '00000000-0000-0000-0000-0000000004a3'::uuid,
  'un contacto corredor confirmado resuelve a su organización broker'
);
select is(
  (select o.type from public.resolve_contact_organization('00000000-0000-0000-0000-0000000004b2') o),
  'broker'::public.org_type,
  'el tipo resuelto para un corredor es broker'
);
reset role;

-- ---------------------------------------------------------------------
-- Arrendatario no tiene organización en este modelo — no resuelve nada
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000401');
select is_empty(
  $$ select 1 from public.resolve_contact_organization('00000000-0000-0000-0000-0000000004b3') $$,
  'un contacto arrendatario nunca resuelve a ninguna organización'
);
reset role;

-- ---------------------------------------------------------------------
-- Pendiente sin confirmar — todavía no hay cuenta que resolver
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000401');
select is_empty(
  $$ select 1 from public.resolve_contact_organization('00000000-0000-0000-0000-0000000004b4') $$,
  'un contacto pendiente (sin confirmar) no resuelve a ninguna organización'
);
reset role;

-- ---------------------------------------------------------------------
-- Frontera de privacidad: no soy miembro de la libreta dueña del contacto
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000408'); -- admin de Org Ajena, no es miembro de Org A
select is_empty(
  $$ select 1 from public.resolve_contact_organization('00000000-0000-0000-0000-0000000004b1') $$,
  'un contacto de una libreta ajena no resuelve nada, aunque esté confirmado y sea perfectamente resoluble para su propio dueño'
);
reset role;

-- Mismo contacto real, visto desde la libreta de Org Ajena (donde SÍ es
-- miembro) — prueba que la frontera es por libreta, no por persona.
select pg_temp.login_as('00000000-0000-0000-0000-000000000408');
select is(
  (select o.id from public.resolve_contact_organization('00000000-0000-0000-0000-0000000004c1') o),
  '00000000-0000-0000-0000-0000000004a2'::uuid,
  'el mismo arrendador resuelve igual cuando se lo mira desde una libreta donde el llamador sí es miembro'
);
reset role;

-- ---------------------------------------------------------------------
-- Cualquier miembro de la libreta (no solo el admin) puede resolver
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000402'); -- agente, no admin, de Org A
select is(
  (select o.id from public.resolve_contact_organization('00000000-0000-0000-0000-0000000004b1') o),
  '00000000-0000-0000-0000-0000000004a2'::uuid,
  'un miembro no-admin de la libreta también puede resolver sus contactos, igual que puede verlos'
);
reset role;

-- ---------------------------------------------------------------------
-- Cuenta con más de una organización: toma la más antigua, determinista
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000401');
select is(
  (select count(*)::int from public.resolve_contact_organization('00000000-0000-0000-0000-0000000004b5')),
  1,
  'una cuenta admin de dos organizaciones igual resuelve a exactamente una fila'
);
select is(
  (select o.id from public.resolve_contact_organization('00000000-0000-0000-0000-0000000004b5') o),
  '00000000-0000-0000-0000-0000000004a5'::uuid,
  'entre varias organizaciones posibles, se resuelve la más antigua (desempate determinista)'
);
reset role;

-- ---------------------------------------------------------------------
-- Una membership no-admin no cuenta como "organización propia"
-- ---------------------------------------------------------------------
select pg_temp.login_as('00000000-0000-0000-0000-000000000401');
select is_empty(
  $$ select 1 from public.resolve_contact_organization('00000000-0000-0000-0000-0000000004b6') $$,
  'ser agente (no admin) de una organización no alcanza para resolverla como la organización propia'
);
reset role;

select * from finish();
rollback;
