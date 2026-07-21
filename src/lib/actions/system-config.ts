"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateSystemConfig(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const fail = (message: string): never => redirect(`/settings?error=${encodeURIComponent(message)}`);

  const comision_guardanza_pct = Number(formData.get("comision_guardanza_pct")) / 100;
  const comision_corredor_pct = Number(formData.get("comision_corredor_pct")) / 100;
  const tasa_interes_anual = Number(formData.get("tasa_interes_anual")) / 100;

  const { error } = await supabase.rpc("update_system_config", {
    p_comision_guardanza_pct: comision_guardanza_pct,
    p_comision_corredor_pct: comision_corredor_pct,
    p_tasa_interes_anual: tasa_interes_anual,
    p_actor_user_id: userRes.user.id,
  });
  if (error) return fail(error.message);

  revalidatePath("/settings");
  redirect("/settings?success=config");
}
