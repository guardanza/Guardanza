-- Tanda B, Paso 6.5: buscador de corredoras abierto a toda la plataforma
-- — reemplaza el código de 6 dígitos (lookup_organization_by_code) por
-- una búsqueda por nombre/RUT, que es como la gente realmente busca una
-- corredora en la vida real.
--
-- ============================================================================
-- PUNTO CRÍTICO DE PRIVACIDAD — leer antes de tocar esta función
-- ============================================================================
-- Es la PRIMERA búsqueda del sistema que mira fuera de tu propia órbita
-- (organización, contrato, o libreta). Todo lo demás en este proyecto
-- exige ser miembro de algo para ver algo. Esta función, a propósito,
-- no exige nada — cualquier usuario autenticado puede buscar CUALQUIER
-- corredora de la plataforma, porque una corredora es un negocio que
-- quiere ser encontrado (mismo principio que ya regía lookup_organization_by_code,
-- solo que ahora por nombre en vez de por código exacto).
--
-- Esto la convierte en un oráculo potencial de datos personales si se
-- construye mal. La garantía que sostiene esta función:
--
--   1. Devuelve ÚNICAMENTE (id, name, rut, org_code) de organizations.
--      Nunca created_by, nunca un JOIN a memberships, nunca un JOIN a
--      profiles. No hay ninguna columna en el SELECT que pueda revelar
--      quién administra la corredora ni quién trabaja ahí.
--   2. Acotada a type = 'broker' — jamás devuelve organizaciones
--      individual (que sí representan a una persona física, no a un
--      negocio que se anuncia).
--   3. No hay una segunda función ni un JOIN posterior en ningún otro
--      lugar del código que tome el id devuelto acá y lo use para leer
--      memberships/profiles de esa corredora sin las reglas normales de
--      RLS — el id solo sirve para escribir properties.broker_organization_id
--      (una operación que ya estaba permitida desde antes, vía el código
--      de 6 dígitos).
--
-- Salvaguardas adicionales (no son la garantía de privacidad en sí, son
-- higiene contra un buscador que se vuelva un vector de abuso):
--   - Prefijo mínimo de 2 caracteres: sin esto, una búsqueda vacía o de
--     1 letra listaría prácticamente todas las corredoras de la
--     plataforma de una sola vez — no es una fuga de datos personales,
--     pero es un volcado de directorio completo que nadie pidió.
--   - Los caracteres especiales de ILIKE (%, _) se despojan ACÁ, en la
--     función misma — no solo en el cliente (que ya lo hace, mismo
--     patrón que la libreta) — porque esta función se llama directo
--     desde el navegador vía supabase-js (grant a authenticated), así
--     que cualquiera podría invocarla sin pasar por la UI.
--   - LIMIT 20: ninguna búsqueda devuelve más de 20 resultados.
create or replace function public.search_broker_organizations(p_prefix text)
returns table (id uuid, name text, rut text, org_code text)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.name, o.rut, o.org_code
  from public.organizations o
  where o.type = 'broker'
    and length(trim(regexp_replace(p_prefix, '[%_]', '', 'g'))) >= 2
    and (
      o.name ilike regexp_replace(trim(p_prefix), '[%_]', '', 'g') || '%'
      or o.rut ilike regexp_replace(trim(p_prefix), '[%_]', '', 'g') || '%'
    )
  order by o.name
  limit 20;
$$;

grant execute on function public.search_broker_organizations(text) to authenticated;
