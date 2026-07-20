"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function createContract(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const property_id = String(formData.get("property_id"));
  const start_date = String(formData.get("start_date"));
  const end_date = String(formData.get("end_date"));
  const rent_amount = Number(formData.get("rent_amount"));
  const rent_currency = String(formData.get("rent_currency"));
  const guarantee_currency = String(formData.get("guarantee_currency"));
  const guarantee_amount = Number(formData.get("guarantee_amount"));
  const tenant_email = String(formData.get("tenant_email"));

  const fail = (message: string): never =>
    redirect(`/contracts/new?property_id=${property_id}&error=${encodeURIComponent(message)}`);

  // Resolve the tenant BEFORE creating the contract — otherwise a bad email
  // leaves an orphaned draft contract with no tenant attached and no way
  // back to it from this form. Needs service_role: profiles RLS can't
  // expose a brand-new counterparty with no shared contract yet.
  const admin = createServiceRoleClient();
  const { data: usersPage, error: lookupError } = await admin.auth.admin.listUsers();
  if (lookupError) return fail(lookupError.message);
  const tenant = usersPage.users.find((u) => u.email === tenant_email);
  if (!tenant) {
    return fail(`No existe una cuenta con el email ${tenant_email}. El arrendatario debe registrarse primero.`);
  }

  const { data: contract, error } = await supabase
    .rpc("create_contract", {
      p_property_id: property_id,
      p_start_date: start_date,
      p_end_date: end_date,
      p_rent_amount: rent_amount,
      p_rent_currency: rent_currency,
      p_guarantee_currency: guarantee_currency,
      p_guarantee_amount: guarantee_amount,
      p_actor_user_id: userRes.user!.id,
    })
    .single<{ id: string }>();
  if (error) return fail(error.message);

  const { error: tenantPartyError } = await supabase
    .from("contract_parties")
    .insert({ contract_id: contract.id, user_id: tenant.id, role: "arrendatario" });
  if (tenantPartyError) return fail(tenantPartyError.message);

  redirect(`/contracts/${contract.id}`);
}

export async function signContract(contractId: string) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { error } = await supabase.rpc("sign_contract", {
    p_contract_id: contractId,
    p_actor_user_id: userRes.user!.id,
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
    p_actor_user_id: userRes.user!.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/contracts/${contractId}`);
}
