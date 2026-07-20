"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createProperty(formData: FormData) {
  const supabase = await createClient();

  const organization_id = String(formData.get("organization_id"));
  const address = String(formData.get("address"));
  const comuna = String(formData.get("comuna") || "") || null;
  const broker_org_code = String(formData.get("broker_org_code") || "").trim() || null;

  const fail = (message: string): never =>
    redirect(`/properties/new?organization_id=${organization_id}&error=${encodeURIComponent(message)}`);

  let broker_organization_id: string | null = null;
  if (broker_org_code) {
    const { data: broker, error: lookupError } = await supabase
      .rpc("lookup_organization_by_code", { p_code: broker_org_code })
      .maybeSingle<{ id: string; name: string; type: string }>();
    if (lookupError) return fail(lookupError.message);
    if (!broker) return fail(`No existe ninguna corredora con el código ${broker_org_code}.`);
    broker_organization_id = broker.id;
  }

  const { data: property, error } = await supabase
    .from("properties")
    .insert({ organization_id, address, comuna, broker_organization_id })
    .select("id")
    .single();

  if (error) return fail(error.message);

  redirect(`/contracts/new?property_id=${property.id}`);
}
