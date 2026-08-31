-- Evaluación de papeles, Etapa 4 — laguna real, mismo patrón que la de
-- Etapa 3 (property_candidates/properties/profiles): org_document_policy
-- y property_document_policy hoy solo son legibles por miembros de la
-- organización — el propio candidato no puede leer la política que le
-- aplica, y sin eso no puede derivar su propia lista de documentos.
--
-- Policies nuevas y separadas, no se tocan las existentes — aditivo,
-- solo AMPLÍA visibilidad. is_own_candidate_participant_property ya
-- existe (Etapa 3) y sirve tal cual para property_document_policy, que
-- ya vive por property_id. org_document_policy vive por organization_id,
-- así que hace falta un helper nuevo que cruce hasta ahí.
create or replace function public.is_own_candidate_participant_organization(p_organization_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.candidate_participants cp
    join public.property_candidates pc on pc.id = cp.property_candidate_id
    join public.properties p on p.id = pc.property_id
    where cp.user_id = p_user_id
      and (p.organization_id = p_organization_id or p.broker_organization_id = p_organization_id)
  );
$$;

grant execute on function public.is_own_candidate_participant_organization(uuid, uuid) to authenticated;

create policy org_document_policy_select_own_candidacy on public.org_document_policy
  for select to authenticated
  using (public.is_own_candidate_participant_organization(org_document_policy.organization_id, auth.uid()));

create policy property_document_policy_select_own_candidacy on public.property_document_policy
  for select to authenticated
  using (public.is_own_candidate_participant_property(property_document_policy.property_id, auth.uid()));
