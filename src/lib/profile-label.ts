import { createClient } from "@/lib/supabase/server";

// Best-effort label for "what kind of profile is this" shown under the
// user's name. Priority: platform admin > corredor/arrendador (still
// derived live from organization membership — arrendador/corredor
// structurally require an org, so that's their persistent signal) >
// arrendatario declarado (profiles.rol_declarado — the persistent signal
// for arrendatario, which has no organization of its own) > arrendatario
// emergente (contract_parties, for accounts that reached arrendatario only
// by being added to a contract before rol_declarado existed) > sin definir.
//
// The contract_parties check is filtered to role='arrendatario'
// specifically — it used to just check "has any row at all", which
// mislabeled a non-admin broker-org agente (snapshotted into
// contract_parties as 'corredor' by create_contract, but never an org
// admin themselves) as "Arrendatario(a)" instead of "Corredor(a)".
//
// NO AUTOMATED TEST COVERS THE PRIORITY ORDER ITSELF: this project has no
// TS-level test runner (only pgTAP, which tests the database, not this
// function) — pgTAP coverage exists for the data this reads (rol_declarado
// getting written correctly, the contract_parties filter) but nothing
// calls this function and asserts on its return value. If you reorder or
// remove one of the five branches above, verify by hand (or add a real
// test runner once there's enough TS logic like this to justify one).
export async function getProfileTypeLabel(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string> {
  const [{ data: profile }, { data: memberships }, { data: parties }] = await Promise.all([
    supabase.from("profiles").select("is_platform_admin, rol_declarado").eq("id", userId).single(),
    supabase.from("memberships").select("role, organizations(type)").eq("user_id", userId).eq("role", "admin"),
    supabase.from("contract_parties").select("role").eq("user_id", userId).eq("role", "arrendatario").limit(1),
  ]);

  if (profile?.is_platform_admin) return "Administrador de plataforma";

  const orgTypes = (memberships ?? [])
    .map((m) => (Array.isArray(m.organizations) ? m.organizations[0] : m.organizations))
    .filter((o): o is { type: string } => !!o)
    .map((o) => o.type);

  if (orgTypes.includes("broker")) return "Corredor(a)";
  if (orgTypes.includes("individual")) return "Arrendador(a)";
  if (profile?.rol_declarado === "arrendatario") return "Arrendatario(a)";
  if (parties && parties.length > 0) return "Arrendatario(a)";
  return "Sin rol definido";
}
