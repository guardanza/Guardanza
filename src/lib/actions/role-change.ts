"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfileTypeLabel } from "@/lib/profile-label";
import { labelToRoleBucket, roleBucketLabel } from "@/lib/role-bucket";

export async function requestRoleChange(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const fail = (message: string): never => redirect(`/profile?error=${encodeURIComponent(message)}`);

  const rolSolicitado = String(formData.get("rol_solicitado") || "");
  const motivo = String(formData.get("motivo") || "").trim();

  if (!["arrendador", "corredor", "arrendatario"].includes(rolSolicitado)) {
    return fail("Selecciona un rol válido.");
  }

  const rolActualSnapshot = await getProfileTypeLabel(supabase, userRes.user.id);
  const currentBucket = labelToRoleBucket(rolActualSnapshot);
  if (currentBucket === rolSolicitado) {
    return fail(`Ya eres ${roleBucketLabel(currentBucket)} — no hay un cambio que solicitar.`);
  }

  const { error } = await supabase.rpc("solicitar_cambio_rol", {
    p_rol_solicitado: rolSolicitado,
    p_rol_actual_snapshot: rolActualSnapshot,
    p_motivo: motivo || null,
  });
  if (error) return fail(error.message);

  revalidatePath("/profile");
  redirect("/profile?success=solicitud");
}
