"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createProperty(formData: FormData) {
  const supabase = await createClient();

  const organization_id = String(formData.get("organization_id"));
  const address = String(formData.get("address"));
  const comuna = String(formData.get("comuna") || "") || null;
  const broker_organization_id = String(formData.get("broker_organization_id") || "") || null;

  const { data: property, error } = await supabase
    .from("properties")
    .insert({ organization_id, address, comuna, broker_organization_id })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  redirect(`/contracts/new?property_id=${property.id}`);
}
