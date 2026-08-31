-- Evaluación de papeles, Etapa 3: laguna real encontrada probando el
-- flujo guiado de verdad — el propio participante (candidate_participants
-- ya lo dejaba ver desde la Etapa 0) necesitaba además leer
-- property_candidates y properties de SU postulación, para mostrar la
-- dirección/arriendo/garantía en la pantalla de bienvenida. Hasta acá
-- ambas tablas solo eran visibles para miembros de la organización
-- dueña o corredora delegada — el propio comentario de
-- property_candidates_select (Tanda D) ya lo anticipaba: "Ampliar esto
-- a que el propio candidato vea su propia fila... queda para cuando
-- exista una pantalla que lo necesite — no vale la pena construirla
-- especulativamente todavía." Esta es esa pantalla.
--
-- Policies nuevas y separadas, no se tocan las existentes — mismo
-- criterio aditivo que contacts_select_via_candidacy (Postgres combina
-- policies permisivas con OR): esto solo AMPLÍA visibilidad, nunca la
-- resta. Funciones SECURITY DEFINER, no un EXISTS inline, por el mismo
-- motivo de siempre: evita que Postgres detecte un ciclo entre tablas
-- al planear.
create or replace function public.is_own_candidate_participant_candidacy(p_property_candidate_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.candidate_participants cp
    where cp.property_candidate_id = p_property_candidate_id and cp.user_id = p_user_id
  );
$$;

grant execute on function public.is_own_candidate_participant_candidacy(uuid, uuid) to authenticated;

create policy property_candidates_select_own_participant on public.property_candidates
  for select to authenticated
  using (public.is_own_candidate_participant_candidacy(property_candidates.id, auth.uid()));

create or replace function public.is_own_candidate_participant_property(p_property_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.candidate_participants cp
    join public.property_candidates pc on pc.id = cp.property_candidate_id
    where pc.property_id = p_property_id and cp.user_id = p_user_id
  );
$$;

grant execute on function public.is_own_candidate_participant_property(uuid, uuid) to authenticated;

create policy properties_select_own_candidacy on public.properties
  for select to authenticated
  using (public.is_own_candidate_participant_property(properties.id, auth.uid()));

-- Mismo hueco, mismo motivo: la pantalla de bienvenida nombra a quien
-- invitó (spec sección 4, "el mensaje nombra a quien lo invitó") — sin
-- esto, profiles_select_self_or_shared bloquea leer el nombre de
-- created_by salvo que ya compartan organización o contrato, que un
-- participante recién confirmado no tiene necesariamente.
create or replace function public.is_candidate_participant_inviter(p_profile_id uuid, p_viewer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.candidate_participants cp
    where cp.created_by = p_profile_id and cp.user_id = p_viewer_id
  );
$$;

grant execute on function public.is_candidate_participant_inviter(uuid, uuid) to authenticated;

create policy profiles_select_candidate_participant_inviter on public.profiles
  for select to authenticated
  using (public.is_candidate_participant_inviter(profiles.id, auth.uid()));
