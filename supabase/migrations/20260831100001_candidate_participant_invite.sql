-- Evaluación de papeles, Etapa 2: token de invitación al participante.
-- Reusa el PATRÓN de contacts (token hasheado + expiración + resolución
-- anónima + confirmación server-side vía funciones SECURITY DEFINER),
-- no el código — hay una diferencia de fondo con contacts que cambia el
-- diseño: acá el consentimiento del participante es el centro del
-- feature (sobre todo para un codeudor, que asume responsabilidad
-- legal), así que NUNCA hay vínculo automático aunque el email ya
-- tenga cuenta — issue_contact_invite/confirm_contact_invite tienen un
-- camino de vínculo directo sin que la otra persona haga nada; acá no
-- existe ese camino, siempre hay invitación explícita y siempre la
-- persona confirma ella misma. Por eso alcanza con DOS caminos (cuenta
-- existente confirma / cuenta nueva se crea y confirma), no tres.
alter table public.candidate_participants
  add column invite_token_hash bytea,
  add column invite_expires_at timestamptz;

create unique index candidate_participants_invite_token_hash_idx
  on public.candidate_participants (invite_token_hash)
  where invite_token_hash is not null;

-- issue_candidate_participant_invite: quien administra la organización
-- dueña o la corredora delegada de la propiedad puede emitir (o
-- reemitir) el link. Mismo criterio de expiración que
-- issue_contact_invite (7 días).
create or replace function public.issue_candidate_participant_invite(p_candidate_participant_id uuid)
returns table (raw_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_property_candidate_id uuid;
  v_org_id uuid;
  v_broker_org_id uuid;
  v_raw_token text;
  v_expires_at timestamptz;
begin
  select cp.property_candidate_id into v_property_candidate_id
  from public.candidate_participants cp
  where cp.id = p_candidate_participant_id;

  if v_property_candidate_id is null then
    raise exception 'candidate_participant % not found', p_candidate_participant_id;
  end if;

  select p.organization_id, p.broker_organization_id
    into v_org_id, v_broker_org_id
  from public.property_candidates pc
  join public.properties p on p.id = pc.property_id
  where pc.id = v_property_candidate_id;

  if not (public.is_org_admin(v_org_id, auth.uid()) or public.is_org_admin(v_broker_org_id, auth.uid())) then
    raise exception 'user % is not authorized to invite for candidate_participant %', auth.uid(), p_candidate_participant_id;
  end if;

  v_raw_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '7 days';

  update public.candidate_participants
    set invite_token_hash = digest(v_raw_token, 'sha256'),
        invite_expires_at = v_expires_at
    where id = p_candidate_participant_id;

  return query select v_raw_token, v_expires_at;
end;
$$;

grant execute on function public.issue_candidate_participant_invite(uuid) to authenticated;

-- resolve_candidate_participant_invite: lookup público por token, sin
-- sesión — mismo modelo de confianza que resolve_contact_invite (el
-- token en sí, 256 bits, es la única credencial necesaria para ver la
-- ficha antes de aceptar). inviter_name viene del perfil de created_by
-- (quien disparó la invitación — hoy siempre un admin de organización,
-- Etapa 3+ podría ser el propio titular invitando a su codeudor) para
-- que el mensaje pueda nombrar a quien invita, spec sección 4: "en
-- codeudor y coarrendatario, el mensaje nombra a quien lo invitó".
create or replace function public.resolve_candidate_participant_invite(p_token text)
returns table (
  candidate_participant_id uuid,
  participant_type public.candidate_participant_type,
  full_name text,
  email text,
  property_address text,
  inviter_name text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select cp.id, cp.participant_type, cp.full_name, cp.email, p.address, inviter.full_name
  from public.candidate_participants cp
  join public.property_candidates pc on pc.id = cp.property_candidate_id
  join public.properties p on p.id = pc.property_id
  join public.profiles inviter on inviter.id = cp.created_by
  where cp.invite_token_hash = digest(p_token, 'sha256')
    and cp.invite_expires_at > now()
    and cp.status = 'invitado';
$$;

grant execute on function public.resolve_candidate_participant_invite(text) to anon, authenticated;

-- confirm_candidate_participant_invite: el token ES la credencial (no
-- auth.uid()) — se llama desde el servidor vía el cliente service-role,
-- nunca expuesta al cliente (sin grant a anon/authenticated), mismo
-- criterio que confirm_contact_invite. A diferencia de esa función, acá
-- NO hay regla de "un solo rol de plataforma" que re-chequear: un
-- codeudor/coarrendatario no está tomando un rol de mercado, solo
-- participa de esta postulación puntual — lo único que se bloquea es
-- que la cuenta destino sea de un administrador de plataforma (mismo
-- criterio que contacts, eso sí se mantiene igual).
create or replace function public.confirm_candidate_participant_invite(p_token text, p_target_user_id uuid)
returns table (ok boolean, candidate_participant public.candidate_participants)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.candidate_participants;
begin
  select * into v_row
  from public.candidate_participants
  where invite_token_hash = digest(p_token, 'sha256')
    and invite_expires_at > now()
    and status = 'invitado';

  if v_row.id is null then
    raise exception 'invalid_or_expired_token';
  end if;

  if public.is_platform_admin(p_target_user_id) then
    return query select false, v_row;
    return;
  end if;

  update public.candidate_participants
    set status = 'en_progreso',
        user_id = p_target_user_id,
        invite_token_hash = null,
        invite_expires_at = null
    where id = v_row.id
    returning * into v_row;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    p_target_user_id, 'candidate_participant.confirmed', 'candidate_participant', v_row.id,
    jsonb_build_object('participant_type', v_row.participant_type, 'property_candidate_id', v_row.property_candidate_id)
  );

  return query select true, v_row;
end;
$$;

grant execute on function public.confirm_candidate_participant_invite(text, uuid) to service_role;
