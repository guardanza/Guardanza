import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";
import { stripParticularSuffix } from "@/lib/labels";
import type { RoleBucket } from "@/lib/role-bucket";
import type { MoneyCurrency } from "@/lib/money";

type Supa = Awaited<ReturnType<typeof createClient>>;

export type UnifiedContactRow = {
  key: string;
  fullName: string;
  email: string | null;
  rut: string | null;
  status: "confirmado" | "pendiente" | null; // null = no hay ficha en tu libreta, solo la capa vieja
  roleConflict: boolean;
  inviteExpiresAt: string | null;
  inviteRejectedAt: string | null;
  // Foto de perfil de la persona detrás de la ficha, si ya tiene cuenta Y
  // el visor puede verla (profiles_select_self_or_shared). null es un
  // caso normal, no un error: una ficha pendiente todavía no tiene
  // cuenta, y la UI cae a las iniciales — que es el placeholder por
  // defecto, no un ícono gris.
  avatarUrl: string | null;
  contactId: string | null; // presente si hay una ficha de libreta detrás (habilita reenviar/quitar)
  organizationId: string | null;
};

// Las tres pestañas de "Mis contactos" leen de dos capas que nunca se
// unieron hasta ahora: la libreta (contacts, Tanda B) y la capa vieja de
// organizaciones/propiedades (Tanda A). Corredores y Arrendadores/Dueños
// necesitan el puente resolve_contact_organization porque su identidad
// "de negocio" cuelga de una organización; Arrendatarios no, porque nunca
// tuvo organización en este modelo — sale directo de property_tenants/
// contract_parties.
//
// De-dup: para corredor/arrendador, la clave es el organization_id
// resuelto — si la misma organización aparece por las dos capas, se
// prefiere la fila de la libreta (más rica: email, RUT, estado de
// invitación) sobre el nombre pelado de organizations. Para arrendatario,
// la clave es el user_id directo, sin ningún puente.
export async function getUnifiedContacts(supabase: Supa, role: RoleBucket, myUserId: string): Promise<UnifiedContactRow[]> {
  if (role === "arrendatario") return getArrendatarios(supabase, myUserId);
  return getOrgBackedRole(supabase, role, myUserId);
}

async function getArrendatarios(supabase: Supa, myUserId: string): Promise<UnifiedContactRow[]> {
  const [{ data: contacts }, { data: tenants }, { data: parties }] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, full_name, email, rut, status, user_id, role_conflict_at, invite_expires_at, invite_rejected_at, profiles!contacts_user_id_fkey(avatar_url)")
      .eq("contact_role", "arrendatario"),
    supabase.from("property_tenants").select("user_id, profiles(full_name, avatar_url)"),
    supabase.from("contract_parties").select("user_id, profiles(full_name, avatar_url)").eq("role", "arrendatario"),
  ]);

  const byUserId = new Map<string, UnifiedContactRow>();
  const byContactId = new Map<string, UnifiedContactRow>(); // pendientes, sin user_id todavía

  for (const c of contacts ?? []) {
    const row: UnifiedContactRow = {
      key: c.user_id ?? `contact:${c.id}`,
      fullName: c.full_name,
      email: c.email,
      rut: c.rut,
      status: c.status,
      roleConflict: !!c.role_conflict_at,
      inviteExpiresAt: c.invite_expires_at,
      inviteRejectedAt: c.invite_rejected_at,
      avatarUrl: one(c.profiles)?.avatar_url ?? null,
      contactId: c.id,
      organizationId: null,
    };
    if (c.user_id) byUserId.set(c.user_id, row);
    else byContactId.set(c.id, row);
  }

  // Layer 1: property_tenants/contract_parties ya tienen user_id directo,
  // sin ningún puente que resolver — pero el nombre puede no ser legible
  // (profiles solo es visible si compartes contrato u organización, ver
  // profiles_select_self_or_shared; un interesado precontractual cargado
  // directo, sin pasar por la libreta, puede no tener nombre visible
  // todavía). Se agrega igual, con el nombre que haya disponible.
  for (const t of [...(tenants ?? []), ...(parties ?? [])]) {
    if (t.user_id === myUserId || byUserId.has(t.user_id)) continue;
    const profile = one(t.profiles);
    byUserId.set(t.user_id, {
      key: t.user_id,
      fullName: profile?.full_name ?? "Arrendatario sin ficha en tu libreta",
      email: null,
      rut: null,
      status: null,
      roleConflict: false,
      inviteExpiresAt: null,
      inviteRejectedAt: null,
      avatarUrl: profile?.avatar_url ?? null,
      contactId: null,
      organizationId: null,
    });
  }

  return [...byUserId.values(), ...byContactId.values()];
}

async function getOrgBackedRole(supabase: Supa, role: "arrendador" | "corredor", myUserId: string): Promise<UnifiedContactRow[]> {
  const [{ data: contacts }, { data: myAdminOrgs }, { data: properties }, { data: landlords }] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, full_name, email, rut, status, user_id, role_conflict_at, invite_expires_at, invite_rejected_at, profiles!contacts_user_id_fkey(avatar_url)")
      .eq("contact_role", role),
    supabase.from("memberships").select("organization_id").eq("user_id", myUserId).eq("role", "admin"),
    supabase.from("properties").select("id, organization_id, broker_organization_id"),
    role === "arrendador" ? supabase.from("property_landlords").select("organization_id") : Promise.resolve({ data: null }),
  ]);

  const myOrgIds = new Set((myAdminOrgs ?? []).map((m) => m.organization_id));

  // Capa vieja: para arrendador, dueños directos + copropietarios de mis
  // propiedades; para corredor, la corredora delegada en mis propiedades.
  // Excluye siempre mi propia organización — soy yo mismo, no un contacto.
  const layer1OrgIds = new Set<string>();
  for (const p of properties ?? []) {
    if (role === "arrendador" && p.organization_id && !myOrgIds.has(p.organization_id)) layer1OrgIds.add(p.organization_id);
    if (role === "corredor" && p.broker_organization_id && !myOrgIds.has(p.broker_organization_id)) layer1OrgIds.add(p.broker_organization_id);
  }
  for (const l of landlords ?? []) {
    if (l.organization_id && !myOrgIds.has(l.organization_id)) layer1OrgIds.add(l.organization_id);
  }

  const byOrgId = new Map<string, UnifiedContactRow>();
  const byContactId = new Map<string, UnifiedContactRow>(); // pendientes, sin organización todavía

  // Contactos confirmados se resuelven en paralelo — tamaño de libreta
  // típico de esta etapa (decenas, no miles), N llamadas al puente es
  // aceptable acá; si la libreta crece mucho, esto es lo primero a
  // optimizar a una función de resolución en lote.
  const confirmedContacts = (contacts ?? []).filter((c) => c.status === "confirmado" && c.user_id && c.user_id !== myUserId);
  const resolutions = await Promise.all(
    confirmedContacts.map((c) => supabase.rpc("resolve_contact_organization", { p_contact_id: c.id }).maybeSingle<{ id: string }>())
  );

  confirmedContacts.forEach((c, i) => {
    const resolvedOrgId = resolutions[i].data?.id ?? null;
    if (!resolvedOrgId || myOrgIds.has(resolvedOrgId)) return; // sin org resoluble, o soy yo mismo
    byOrgId.set(resolvedOrgId, {
      key: resolvedOrgId,
      fullName: c.full_name,
      email: c.email,
      rut: c.rut,
      status: c.status,
      roleConflict: !!c.role_conflict_at,
      inviteExpiresAt: c.invite_expires_at,
      inviteRejectedAt: c.invite_rejected_at,
      avatarUrl: one(c.profiles)?.avatar_url ?? null,
      contactId: c.id,
      organizationId: resolvedOrgId,
    });
  });

  for (const c of contacts ?? []) {
    if (c.status !== "pendiente") continue;
    byContactId.set(c.id, {
      key: `contact:${c.id}`,
      fullName: c.full_name,
      email: c.email,
      rut: c.rut,
      status: c.status,
      roleConflict: !!c.role_conflict_at,
      inviteExpiresAt: c.invite_expires_at,
      inviteRejectedAt: c.invite_rejected_at,
      avatarUrl: one(c.profiles)?.avatar_url ?? null,
      contactId: c.id,
      organizationId: null,
    });
  }

  const missingOrgIds = [...layer1OrgIds].filter((id) => !byOrgId.has(id));
  if (missingOrgIds.length > 0) {
    const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", missingOrgIds);
    for (const o of orgs ?? []) {
      byOrgId.set(o.id, {
        key: o.id,
        fullName: stripParticularSuffix(o.name),
        email: null,
        rut: null,
        status: null,
        roleConflict: false,
        inviteExpiresAt: null,
        inviteRejectedAt: null,
        // Una organización de la capa vieja no tiene foto de perfil —
        // cae a iniciales, igual que cualquier ficha sin cuenta.
        avatarUrl: null,
        contactId: null,
        organizationId: o.id,
      });
    }
  }

  return [...byOrgId.values(), ...byContactId.values()];
}

export type PersonProperty = { id: string; address: string };
export type PersonContract = { id: string; status: string; rentAmount: number; rentCurrency: MoneyCurrency; propertyAddress: string };
export type PersonDetail = { row: UnifiedContactRow; properties: PersonProperty[]; contracts: PersonContract[] };

const PENDING_KEY_PREFIX = "contact:";

// Paso 6.3: propiedades y contratos asociados a una persona de "Mis
// contactos", según su rol. Reusa getUnifiedContacts para encontrar la
// fila (misma clave de de-dup) en vez de duplicar esa lógica — el costo
// extra de recalcular la lista completa es aceptable al tamaño de libreta
// de esta etapa. Pendientes (key con prefijo PENDING_KEY_PREFIX) no
// tienen organización/cuenta resuelta todavía, así que no hay nada que
// buscar — vuelven con listas vacías, no es un error.
//
// Ni esto ni los dos helpers de abajo agregan ninguna consulta con
// privilegios especiales: todo corre con la RLS normal del usuario
// autenticado, que ya acota exactamente a "lo que compartes con esta
// persona" (properties_select_member exige ser miembro de la organización
// dueña o de la corredora delegada — nunca el portfolio completo de un
// tercero solo por haberlo cargado en tu libreta).
export async function getPersonDetail(supabase: Supa, role: RoleBucket, key: string, myUserId: string): Promise<PersonDetail | null> {
  const rows = await getUnifiedContacts(supabase, role, myUserId);
  const row = rows.find((r) => r.key === key);
  if (!row) return null;

  if (key.startsWith(PENDING_KEY_PREFIX)) {
    return { row, properties: [], contracts: [] };
  }

  const { properties, contracts } =
    role === "arrendatario" ? await getArrendatarioAssets(supabase, key) : await getOrgAssets(supabase, role, key);
  return { row, properties, contracts };
}

async function getArrendatarioAssets(supabase: Supa, userId: string): Promise<{ properties: PersonProperty[]; contracts: PersonContract[] }> {
  const [{ data: tenantRows }, { data: partyRows }] = await Promise.all([
    supabase.from("property_tenants").select("properties(id, address)").eq("user_id", userId),
    supabase
      .from("contract_parties")
      .select("contracts(id, status, rent_amount, rent_currency, properties(address))")
      .eq("user_id", userId)
      .eq("role", "arrendatario"),
  ]);

  const propertyById = new Map<string, PersonProperty>();
  for (const t of tenantRows ?? []) {
    const p = one(t.properties);
    if (p) propertyById.set(p.id, p);
  }

  const contracts: PersonContract[] = [];
  for (const pt of partyRows ?? []) {
    const contract = one(pt.contracts);
    if (!contract) continue;
    const property = one(contract.properties);
    contracts.push({
      id: contract.id,
      status: contract.status,
      rentAmount: contract.rent_amount,
      rentCurrency: contract.rent_currency,
      propertyAddress: property?.address ?? "—",
    });
  }

  return { properties: [...propertyById.values()], contracts };
}

async function getOrgAssets(
  supabase: Supa,
  role: "arrendador" | "corredor",
  orgId: string
): Promise<{ properties: PersonProperty[]; contracts: PersonContract[] }> {
  const propertyById = new Map<string, PersonProperty>();

  if (role === "corredor") {
    const { data } = await supabase.from("properties").select("id, address").eq("broker_organization_id", orgId);
    for (const p of data ?? []) propertyById.set(p.id, p);
  } else {
    const [{ data: owned }, { data: landlordRows }] = await Promise.all([
      supabase.from("properties").select("id, address").eq("organization_id", orgId),
      supabase.from("property_landlords").select("properties(id, address)").eq("organization_id", orgId),
    ]);
    for (const p of owned ?? []) propertyById.set(p.id, p);
    for (const l of landlordRows ?? []) {
      const p = one(l.properties);
      if (p) propertyById.set(p.id, p);
    }
  }

  const propertyIds = [...propertyById.keys()];
  if (propertyIds.length === 0) return { properties: [], contracts: [] };

  const { data: contractRows } = await supabase
    .from("contracts")
    .select("id, status, rent_amount, rent_currency, property_id")
    .in("property_id", propertyIds);

  const contracts: PersonContract[] = (contractRows ?? []).map((c) => ({
    id: c.id,
    status: c.status,
    rentAmount: c.rent_amount,
    rentCurrency: c.rent_currency,
    propertyAddress: propertyById.get(c.property_id)?.address ?? "—",
  }));

  return { properties: [...propertyById.values()], contracts };
}
