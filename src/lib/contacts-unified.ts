import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";
import { stripParticularSuffix } from "@/lib/labels";
import type { RoleBucket } from "@/lib/role-bucket";

type Supa = Awaited<ReturnType<typeof createClient>>;

export type UnifiedContactRow = {
  key: string;
  fullName: string;
  email: string | null;
  rut: string | null;
  status: "confirmado" | "pendiente" | null; // null = no hay ficha en tu libreta, solo la capa vieja
  roleConflict: boolean;
  inviteExpiresAt: string | null;
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
      .select("id, full_name, email, rut, status, user_id, role_conflict_at, invite_expires_at")
      .eq("contact_role", "arrendatario"),
    supabase.from("property_tenants").select("user_id, profiles(full_name)"),
    supabase.from("contract_parties").select("user_id, profiles(full_name)").eq("role", "arrendatario"),
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
      contactId: c.id,
      organizationId: null,
    };
    if (c.user_id) byUserId.set(c.user_id, row);
    else byContactId.set(c.id, row);
  }

  // Layer 1: property_tenants/contract_parties ya tienen user_id directo,
  // sin ningún puente que resolver — pero el nombre puede no ser legible
  // (profiles solo es visible si compartís contrato u organización, ver
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
      .select("id, full_name, email, rut, status, user_id, role_conflict_at, invite_expires_at")
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
        contactId: null,
        organizationId: o.id,
      });
    }
  }

  return [...byOrgId.values(), ...byContactId.values()];
}
