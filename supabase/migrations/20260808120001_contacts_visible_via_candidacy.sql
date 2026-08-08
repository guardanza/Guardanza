-- Encontrado en la verificación del paso 5: el arrendador no podía ver
-- el nombre de un candidato que el CORREDOR agregó desde su propia
-- libreta (y sería igual al revés) — property_candidates_select ya deja
-- ver la fila del vínculo a cualquier miembro de la org dueña o de la
-- corredora delegada, pero el join a contacts quedaba cortado por la
-- RLS propia de esa tabla (is_org_member de LA ORGANIZACIÓN DEL
-- CONTACTO específicamente, sin relación con la propiedad en común).
-- Ambas partes gestionan la misma lista de candidatos para la misma
-- propiedad — si pueden ver la candidatura, tienen que poder ver de
-- quién se trata.
--
-- Función SECURITY DEFINER en vez de un EXISTS directo dentro de la
-- policy: property_candidates_insert (Paso 1-4) ya lee contacts en su
-- WITH CHECK — si la policy de contacts a su vez lee property_candidates
-- directo, Postgres detecta el ciclo entre las dos tablas y rechaza
-- planear la consulta ("infinite recursion detected in policy"), incluso
-- sin que la recursión ocurra en los datos reales. Mismo motivo por el
-- que is_org_admin/is_org_member ya son funciones y no subconsultas
-- inline — acá aplica igual: la función corre con los privilegios del
-- dueño (bypassa RLS puertas adentro), así que la lectura de
-- property_candidates de acá nunca vuelve a disparar su propia policy.
create or replace function public.is_contact_candidate_visible(p_contact_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.property_candidates pc
    join public.properties p on p.id = pc.property_id
    where pc.contact_id = p_contact_id
      and (public.is_org_member(p.organization_id, p_user_id) or public.is_org_member(p.broker_organization_id, p_user_id))
  );
$$;

grant execute on function public.is_contact_candidate_visible(uuid, uuid) to authenticated;

-- Policy nueva y separada (no se toca contacts_select) — en Postgres,
-- varias policies permisivas para el mismo comando se combinan con OR,
-- así que esto solo AMPLÍA la visibilidad, nunca la resta. Mismo patrón
-- aditivo que organizations_select_shared_property.
create policy contacts_select_via_candidacy on public.contacts
  for select to authenticated
  using (public.is_contact_candidate_visible(contacts.id, auth.uid()));
