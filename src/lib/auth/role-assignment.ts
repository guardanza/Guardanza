import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Plain server-only module, deliberately NOT a "use server" actions file —
// these helpers take a Supabase client as a parameter (not serializable),
// which doesn't belong in a file whose exports can be invoked as RPC
// server actions from the client.
export type AssignableRole = "arrendador" | "corredor" | "arrendatario";

// "¿esta cuenta ya tiene algún rol?" — un solo criterio, reusado por
// signUpWithRole, el callback de Google, y chooseRole (elegir rol
// post-login). Antes cada uno chequeaba una cosa distinta (el callback de
// Google solo miraba memberships, nunca rol_declarado) — eso es
// exactamente cómo alguien que ya era arrendatario podía "registrarse" de
// nuevo como corredor vía Google y quedar con rol_declarado pisado y una
// organización fantasma. Un solo criterio, compartido, cierra ese hueco.
async function hasAnyRoleAlready(admin: ReturnType<typeof createServiceRoleClient>, userId: string): Promise<boolean> {
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    admin.from("profiles").select("rol_declarado").eq("id", userId).single(),
    admin.from("memberships").select("id").eq("user_id", userId).limit(1),
  ]);
  return !!profile?.rol_declarado || !!(memberships && memberships.length > 0);
}

// Crea organización+membership+rol_declarado para arrendador/corredor, o
// solo rol_declarado para arrendatario — pero JAMÁS si la cuenta ya tiene
// algún rol asentado (hasAnyRoleAlready). Nunca pisa un rol existente,
// nunca crea una segunda organización para quien ya administra una.
export async function assignRoleIfNone(input: {
  userId: string;
  role: AssignableRole;
  legalForm?: string;
  companyName?: string;
  rut?: string | null;
  fallbackName: string;
}): Promise<{ error?: string }> {
  const admin = createServiceRoleClient();
  if (await hasAnyRoleAlready(admin, input.userId)) return {};

  if (input.role === "arrendador" || input.role === "corredor") {
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({
        type: input.role === "corredor" ? "broker" : "individual",
        name: input.role === "corredor" ? input.companyName : `${input.fallbackName} (particular)`,
        rut: input.rut ?? null,
        legal_form: input.role === "corredor" ? input.legalForm : "persona_natural",
        created_by: input.userId,
      })
      .select("id")
      .single();
    if (orgError) return { error: orgError.message };

    const { error: memError } = await admin
      .from("memberships")
      .insert({ user_id: input.userId, organization_id: org.id, role: "admin" });
    if (memError) return { error: memError.message };

    const { error: roleError } = await admin.from("profiles").update({ rol_declarado: input.role }).eq("id", input.userId);
    if (roleError) return { error: roleError.message };
  } else {
    const { error: roleError } = await admin
      .from("profiles")
      .update({ rol_declarado: "arrendatario" })
      .eq("id", input.userId);
    if (roleError) return { error: roleError.message };
  }
  return {};
}
