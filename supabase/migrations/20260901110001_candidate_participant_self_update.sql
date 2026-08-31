-- Evaluación de papeles, Etapa 3: la propia persona necesita poder
-- guardar SU identidad y tipo de ingreso — hasta acá,
-- candidate_participants_update (Etapa 0) solo dejaba escribir a un
-- miembro de la organización, nunca al propio participante (a
-- diferencia de la policy de SELECT, que sí lo contempla desde el
-- principio). Se reemplaza la policy, no se agrega una segunda: dos
-- policies de UPDATE se combinarían con OR de forma correcta igual,
-- pero tener un solo lugar de verdad para "quién puede escribir acá"
-- es más fácil de auditar más adelante.
--
-- El WITH CHECK sigue igual (status <> 'completado', defensa en
-- profundidad) — el candado real sigue siendo que ningún server action
-- de este proyecto construye una UPDATE que toque status/user_id fuera
-- de confirm_candidate_participant_invite, mismo criterio ya
-- documentado en la Etapa 0.
drop policy if exists candidate_participants_update on public.candidate_participants;
create policy candidate_participants_update on public.candidate_participants
  for update to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.property_candidates pc
      join public.properties p on p.id = pc.property_id
      where pc.id = candidate_participants.property_candidate_id
        and (public.is_org_member(p.organization_id, auth.uid()) or public.is_org_member(p.broker_organization_id, auth.uid()))
    )
  )
  with check (status <> 'completado');
