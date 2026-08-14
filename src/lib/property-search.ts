import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";

type Supa = Awaited<ReturnType<typeof createClient>>;

// Mismo saneo que CandidateSearchField/LandlordSearchField: estos
// caracteres tienen significado especial en la sintaxis .or() de
// PostgREST (coma separa condiciones, paréntesis las agrupa) o son
// wildcards de ILIKE (%, _) — se quitan para que la búsqueda nunca arme
// un filtro distinto al que la persona escribió.
function sanitizeTerm(raw: string): string {
  return raw.trim().replace(/[%_,()]/g, "");
}

// Encuentra qué propiedades calzan con un texto de búsqueda, cruzando
// dirección + arrendador + arrendatario/candidato. Devuelve null si no
// hay término válido (sin filtro activo, se muestra el catálogo
// completo) o un Set de property_id (posiblemente vacío) si lo hay.
//
// Privacidad: cada consulta corre con el cliente Supabase del usuario
// autenticado (el mismo que ya arma la página) — las políticas RLS de
// properties, organizations, property_landlords, contacts,
// property_candidates, property_tenants y contract_parties ya acotan
// cada tabla a lo que esta persona puede ver. No hay ninguna consulta acá
// que use una clave con más privilegios: el buscador nunca puede
// devolver una propiedad que la lista normal no mostraría.
//
// Arrendatario tiene dos caminos porque el producto tiene dos formas de
// llegar a tener uno (ver src/lib/contacts-unified.ts para el mismo
// cruce en Mis Contactos):
//   1. Vía candidatos (el camino con evaluación): contacts
//      (contact_role='arrendatario', con email) -> property_candidates.
//      Cubre tanto al candidato en evaluación como al ganador ya
//      adjudicado (el estado queda en 'seleccionado', la fila no se borra).
//   2. Vía contrato directo ("+ Nuevo contrato", sin evaluación): no deja
//      ficha en contacts, así que ahí solo hay nombre/RUT vía profiles
//      (contract_parties/property_tenants) — sin email, porque esa ruta
//      nunca lo captura en ninguna tabla accesible. Limitación de datos
//      conocida y aceptada, no un bug de la búsqueda.
export async function searchPropertyIds(supabase: Supa, rawQuery: string): Promise<Set<string> | null> {
  const term = sanitizeTerm(rawQuery);
  if (term.length < 2) return null;

  const like = `%${term}%`;
  const propertyIds = new Set<string>();

  const [{ data: addressRows }, { data: orgRows }, { data: tenantContactRows }, { data: tenantProfileRows }] = await Promise.all([
    supabase.from("properties").select("id").ilike("address", like),
    supabase.from("organizations").select("id").or(`name.ilike.${like},rut.ilike.${like}`),
    supabase.from("contacts").select("id").eq("contact_role", "arrendatario").or(`full_name.ilike.${like},email.ilike.${like},rut.ilike.${like}`),
    supabase.from("profiles").select("id").or(`full_name.ilike.${like},rut.ilike.${like}`),
  ]);

  for (const p of addressRows ?? []) propertyIds.add(p.id);

  const orgIds = (orgRows ?? []).map((o) => o.id);
  if (orgIds.length > 0) {
    const { data: landlordRows } = await supabase.from("property_landlords").select("property_id").in("organization_id", orgIds);
    for (const l of landlordRows ?? []) propertyIds.add(l.property_id);
  }

  const contactIds = (tenantContactRows ?? []).map((c) => c.id);
  if (contactIds.length > 0) {
    const { data: candidateRows } = await supabase.from("property_candidates").select("property_id").in("contact_id", contactIds);
    for (const c of candidateRows ?? []) propertyIds.add(c.property_id);
  }

  const profileIds = (tenantProfileRows ?? []).map((p) => p.id);
  if (profileIds.length > 0) {
    const [{ data: tenantRows }, { data: partyRows }] = await Promise.all([
      supabase.from("property_tenants").select("property_id").in("user_id", profileIds),
      supabase.from("contract_parties").select("contracts(property_id)").eq("role", "arrendatario").in("user_id", profileIds),
    ]);
    for (const t of tenantRows ?? []) propertyIds.add(t.property_id);
    for (const row of partyRows ?? []) {
      const contract = one(row.contracts);
      if (contract) propertyIds.add(contract.property_id);
    }
  }

  return propertyIds;
}
