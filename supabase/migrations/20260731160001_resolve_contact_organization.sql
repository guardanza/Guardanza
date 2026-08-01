-- Tanda B, Paso 6.1 (vista unificada de contactos): el puente persona→
-- organización.
--
-- El modelo de negocio dice "un copropietario ES un arrendador, vive en la
-- libreta como persona" — pero la autorización real de dueño de propiedad
-- sigue colgando de organizations/property_landlords (capa vieja de Tanda
-- A, que no se toca). resolve_contact_organization es el puente entre las
-- dos: dado un contacto de TU libreta, devuelve la organización real de
-- esa persona, sin que ningún llamador tenga que saber que existe ese
-- tecnicismo.
--
-- Centraliza una consulta que ya vivía duplicada 3 veces (ejecutar_cambio_rol,
-- role_change_admin_resolution y su wrapper): "¿de qué organización es
-- admin este usuario?" — acá restringida además al tipo de organización
-- que corresponde al rol del contacto (corredor→broker, arrendador→
-- individual), mismo criterio de contact_target_role (Paso 3).
--
-- Por qué SECURITY DEFINER + chequeo explícito de is_org_member: sin esto,
-- la función bypassearía la RLS de `contacts` (solo ves la libreta de tu
-- propia organización) y devolvería la organización de CUALQUIER contact_id
-- que alguien probara, aunque no fuera tuyo — el chequeo adentro de la
-- función reproduce esa misma frontera en vez de heredarla de la RLS.
--
-- Solo resuelve contactos CONFIRMADOS (con user_id poblado) — un contacto
-- pendiente no tiene cuenta todavía, no hay nada que resolver. Devuelve
-- cero filas para arrendatario (no tiene organización en este modelo) y
-- para cualquier contacto que no sea tuyo.
--
-- Ambigüedad de múltiples organizaciones por cuenta: create_organization()
-- no impide hoy que una cuenta administre más de una organización del
-- mismo tipo. Mientras esa puerta siga abierta, esta función toma la más
-- antigua (order by m.created_at) — mismo criterio de tolerancia que ya
-- usa contact_target_role/ejecutar_cambio_rol (toman cualquiera que
-- matchee, no validan unicidad). Si la Decisión 3 de esta tanda cierra esa
-- puerta con una constraint, esta función deja de necesitar el
-- desempate — no hace falta tocarla de nuevo, simplemente deja de haber
-- más de una fila para ordenar.
create or replace function public.resolve_contact_organization(p_contact_id uuid)
returns table (id uuid, name text, type public.org_type)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.name, o.type
  from public.contacts c
  join public.memberships m on m.user_id = c.user_id and m.role = 'admin'
  join public.organizations o on o.id = m.organization_id
    and o.type = case c.contact_role
      when 'corredor' then 'broker'::public.org_type
      when 'arrendador' then 'individual'::public.org_type
    end
  where c.id = p_contact_id
    and c.status = 'confirmado'
    and c.user_id is not null
    and public.is_org_member(c.organization_id, auth.uid())
  order by m.created_at
  limit 1;
$$;

grant execute on function public.resolve_contact_organization(uuid) to authenticated;
