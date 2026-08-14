"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasCompletedProfile } from "@/lib/profile-completeness";

// Defense in depth behind the UI-level block on the pages that render
// these actions (RequireRutPrompt) — the RUT gate has to hold even if
// someone submits the form directly, not just when they click through it.
async function requireRut(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase.from("profiles").select("rut").eq("id", userId).single();
  if (!hasCompletedProfile(profile)) throw new Error("Necesitas completar tu RUT antes de firmar o crear contratos.");
}

export async function signContractLandlord(contractId: string) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");
  await requireRut(supabase, userRes.user.id);

  const { error } = await supabase.rpc("sign_contract_landlord", {
    p_contract_id: contractId,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/contracts/${contractId}`);
}

export async function signContractTenant(contractId: string) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");
  await requireRut(supabase, userRes.user.id);

  const { error } = await supabase.rpc("sign_contract_tenant", {
    p_contract_id: contractId,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/contracts/${contractId}`);
}

export async function cancelContract(contractId: string) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { error } = await supabase.rpc("cancel_contract", {
    p_contract_id: contractId,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/contracts/${contractId}`);
}

export async function payGuarantee(guaranteeId: string, contractId: string) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { error } = await supabase.rpc("pay_guarantee", {
    p_guarantee_id: guaranteeId,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/contracts/${contractId}`);
}
