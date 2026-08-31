-- pgTAP suite para la migración 20260831100001 (Evaluación de papeles,
-- Etapa 2 — token de invitación al participante). Propio rango de UUID:
-- usuarios ...000001201-...000001206, orgs ...0000000012a1/12a2,
-- propiedad ...0000000012c1, candidatura ...0000000012d1, participante
-- ...0000000012e1.

begin;
select plan(20);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000001201', 'cpi-arrendador@test.local'),   -- admin de la org dueña
  ('00000000-0000-0000-0000-000000001202', 'cpi-corredor@test.local'),     -- admin de la corredora delegada
  ('00000000-0000-0000-0000-000000001203', 'cpi-agente@test.local'),       -- agente (no admin) de la corredora
  ('00000000-0000-0000-0000-000000001204', 'cpi-titular@test.local'),      -- titular, contacto ya confirmado
  ('00000000-0000-0000-0000-000000001205', 'cpi-nueva-cuenta@test.local'), -- va a "aceptar" con una cuenta nueva
  ('00000000-0000-0000-0000-000000001206', 'cpi-platform-admin@test.local'); -- admin de plataforma

update public.profiles set is_platform_admin = true where id = '00000000-0000-0000-0000-000000001206';

insert into public.organizations (id, type, name, created_by) values
  ('00000000-0000-0000-0000-0000000012a1', 'individual', 'Dueña CPI Test', '00000000-0000-0000-0000-000000001201'),
  ('00000000-0000-0000-0000-0000000012a2', 'broker', 'Corredora CPI Test', '00000000-0000-0000-0000-000000001202');

insert into public.memberships (user_id, organization_id, role) values
  ('00000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-0000000012a1', 'admin'),
  ('00000000-0000-0000-0000-000000001202', '00000000-0000-0000-0000-0000000012a2', 'admin'),
  ('00000000-0000-0000-0000-000000001203', '00000000-0000-0000-0000-0000000012a2', 'agente');

insert into public.properties (id, organization_id, broker_organization_id, address) values
  ('00000000-0000-0000-0000-0000000012c1', '00000000-0000-0000-0000-0000000012a1', '00000000-0000-0000-0000-0000000012a2', 'Propiedad CPI Test');

insert into public.contacts (id, organization_id, contact_role, full_name, email, status, user_id, confirmed_at, created_by) values
  ('00000000-0000-0000-0000-0000000012b1', '00000000-0000-0000-0000-0000000012a1', 'arrendatario', 'Titular CPI Test', 'cpi-titular@test.local', 'confirmado', '00000000-0000-0000-0000-000000001204', now(), '00000000-0000-0000-0000-000000001201');

insert into public.property_candidates (id, property_id, contact_id) values
  ('00000000-0000-0000-0000-0000000012d1', '00000000-0000-0000-0000-0000000012c1', '00000000-0000-0000-0000-0000000012b1');

insert into public.candidate_participants (id, property_candidate_id, participant_type, full_name, email, created_by) values
  ('00000000-0000-0000-0000-0000000012e1', '00000000-0000-0000-0000-0000000012d1', 'titular', 'Titular CPI Test', 'cpi-titular@test.local', '00000000-0000-0000-0000-000000001201');

create or replace function pg_temp.login_as(p_user_id uuid) returns void as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- 1) issue_candidate_participant_invite
-- ---------------------------------------------------------------------
create temporary table invite_capture (seq serial primary key, raw_token text, expires_at timestamptz);
grant insert, select on invite_capture to authenticated;
grant usage on sequence invite_capture_seq_seq to authenticated;

select pg_temp.login_as('00000000-0000-0000-0000-000000001201'); -- admin de la org dueña
insert into invite_capture (raw_token, expires_at)
  select raw_token, expires_at from public.issue_candidate_participant_invite('00000000-0000-0000-0000-0000000012e1');
reset role;

select isnt(
  (select raw_token from invite_capture),
  null,
  'issue_candidate_participant_invite: devuelve un token crudo'
);
select is(
  (select invite_token_hash from public.candidate_participants where id = '00000000-0000-0000-0000-0000000012e1'),
  (select extensions.digest((select raw_token from invite_capture), 'sha256')),
  'issue_candidate_participant_invite: guarda el hash sha256 del token, no el token en sí'
);
select cmp_ok(
  (select expires_at from invite_capture), '>', now() + interval '6 days 23 hours',
  'issue_candidate_participant_invite: expira a ~7 días, no antes'
);
select cmp_ok(
  (select expires_at from invite_capture), '<', now() + interval '7 days 1 hour',
  'issue_candidate_participant_invite: expira a ~7 días, no después'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000001203'); -- agente, no admin
select throws_ok(
  $$ select public.issue_candidate_participant_invite('00000000-0000-0000-0000-0000000012e1') $$,
  'P0001',
  null,
  'un agente sin permiso de admin no puede emitir la invitación'
);
reset role;

-- Reenvío: captura de nuevo (issue_candidate_participant_invite pisa el
-- token anterior) — de acá en más, todos los resolve/confirm de abajo
-- usan ESTE token, no el de la primera emisión, que ya quedó inválido.
select pg_temp.login_as('00000000-0000-0000-0000-000000001202'); -- admin de la corredora delegada
insert into invite_capture (raw_token, expires_at)
  select raw_token, expires_at from public.issue_candidate_participant_invite('00000000-0000-0000-0000-0000000012e1');
reset role;

select isnt(
  (select raw_token from invite_capture order by seq desc limit 1),
  (select raw_token from invite_capture order by seq asc limit 1),
  'el admin de la corredora delegada también puede emitir (reenviar) la invitación, y el token cambia'
);

-- ---------------------------------------------------------------------
-- 2) resolve_candidate_participant_invite
-- ---------------------------------------------------------------------
select is(
  (select participant_type::text from public.resolve_candidate_participant_invite((select raw_token from invite_capture order by seq desc limit 1))),
  'titular',
  'resolve_candidate_participant_invite: participant_type correcto'
);
select is(
  (select property_address from public.resolve_candidate_participant_invite((select raw_token from invite_capture order by seq desc limit 1))),
  'Propiedad CPI Test',
  'resolve_candidate_participant_invite: dirección de la propiedad correcta'
);
-- inviter_name viene de created_by (el admin que disparó la
-- invitación), NO del propio titular — así es como el mensaje puede
-- nombrar a quien invita, spec sección 4.
select is(
  (select inviter_name from public.resolve_candidate_participant_invite((select raw_token from invite_capture order by seq desc limit 1))),
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-000000001201'),
  'resolve_candidate_participant_invite: nombra a quien invitó (created_by), no al propio participante'
);

select is(
  (select count(*)::int from public.resolve_candidate_participant_invite('token-que-no-existe')),
  0,
  'un token que no matchea ningún hash no resuelve nada'
);

-- Token vencido: no resuelve, aunque el hash matchee.
update public.candidate_participants set invite_expires_at = now() - interval '1 minute' where id = '00000000-0000-0000-0000-0000000012e1';
select is(
  (select count(*)::int from public.resolve_candidate_participant_invite((select raw_token from invite_capture order by seq desc limit 1))),
  0,
  'un token vencido no resuelve nada'
);
update public.candidate_participants set invite_expires_at = now() + interval '7 days' where id = '00000000-0000-0000-0000-0000000012e1';

-- ---------------------------------------------------------------------
-- 3) confirm_candidate_participant_invite
-- ---------------------------------------------------------------------
-- Token/hash inválido: lanza excepción (no hay ninguna fila que marcar).
select throws_ok(
  $$ select public.confirm_candidate_participant_invite('token-que-no-existe', '00000000-0000-0000-0000-000000001205') $$,
  'P0001',
  'invalid_or_expired_token',
  'confirm_candidate_participant_invite: un token inválido lanza excepción'
);

-- Cuenta de plataforma: ok=false, sin vincular nada.
select is(
  (select ok from public.confirm_candidate_participant_invite((select raw_token from invite_capture order by seq desc limit 1), '00000000-0000-0000-0000-000000001206')),
  false,
  'confirm_candidate_participant_invite: una cuenta de administrador de plataforma no puede confirmarse (ok=false)'
);
select is(
  (select user_id from public.candidate_participants where id = '00000000-0000-0000-0000-0000000012e1'),
  null::uuid,
  'confirm_candidate_participant_invite: el intento con platform admin no dejó user_id vinculado'
);

-- Camino real: cuenta nueva/existente confirma.
select is(
  (select ok from public.confirm_candidate_participant_invite((select raw_token from invite_capture order by seq desc limit 1), '00000000-0000-0000-0000-000000001205')),
  true,
  'confirm_candidate_participant_invite: cuenta válida confirma (ok=true)'
);
select is(
  (select status::text from public.candidate_participants where id = '00000000-0000-0000-0000-0000000012e1'),
  'en_progreso',
  'confirm_candidate_participant_invite: el estado pasa a en_progreso'
);
select is(
  (select user_id from public.candidate_participants where id = '00000000-0000-0000-0000-0000000012e1'),
  '00000000-0000-0000-0000-000000001205'::uuid,
  'confirm_candidate_participant_invite: user_id queda vinculado a quien confirmó'
);
select is(
  (select invite_token_hash from public.candidate_participants where id = '00000000-0000-0000-0000-0000000012e1'),
  null::bytea,
  'confirm_candidate_participant_invite: el token queda invalidado tras confirmar'
);
select is(
  (select count(*)::int from public.audit_log where entity_type = 'candidate_participant' and entity_id = '00000000-0000-0000-0000-0000000012e1' and action = 'candidate_participant.confirmed'),
  1,
  'confirm_candidate_participant_invite: deja registro en audit_log'
);

-- Confirmar de nuevo con el mismo token (ya invalidado) debe fallar —
-- no se puede "usar dos veces" un link de evaluación.
select throws_ok(
  $$ select public.confirm_candidate_participant_invite((select raw_token from invite_capture order by seq desc limit 1), '00000000-0000-0000-0000-000000001205') $$,
  'P0001',
  'invalid_or_expired_token',
  'un token ya usado no se puede volver a confirmar'
);

select * from finish();
rollback;
