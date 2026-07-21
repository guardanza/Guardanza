import { createClient } from "@/lib/supabase/server";

// Best-effort label for "what kind of profile is this" shown under the
// user's name — derived from their current memberships/contract roles
// rather than a single stored field, since a person's role isn't fixed at
// signup in the existing data model. Priority: platform admin > broker >
// arrendador > arrendatario > sin definir.
export async function getProfileTypeLabel(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string> {
  const [{ data: profile }, { data: memberships }, { data: parties }] = await Promise.all([
    supabase.from("profiles").select("is_platform_admin").eq("id", userId).single(),
    supabase.from("memberships").select("role, organizations(type)").eq("user_id", userId).eq("role", "admin"),
    supabase.from("contract_parties").select("role").eq("user_id", userId).limit(1),
  ]);

  if (profile?.is_platform_admin) return "Administrador de plataforma";

  const orgTypes = (memberships ?? [])
    .map((m) => (Array.isArray(m.organizations) ? m.organizations[0] : m.organizations))
    .filter((o): o is { type: string } => !!o)
    .map((o) => o.type);

  if (orgTypes.includes("broker")) return "Corredor(a)";
  if (orgTypes.includes("individual")) return "Arrendador(a)";
  if (parties && parties.length > 0) return "Arrendatario(a)";
  return "Sin rol definido";
}
