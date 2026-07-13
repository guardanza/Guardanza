"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createRepairReference(formData: FormData) {
  const supabase = await createClient();

  const code = String(formData.get("code"));
  const description = String(formData.get("description"));
  const unit = String(formData.get("unit"));
  const unit_price = Number(formData.get("unit_price"));

  const { data: reference, error } = await supabase
    .from("repair_reference")
    .insert({ code, description, unit })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: versionError } = await supabase
    .from("repair_reference_versions")
    .insert({ repair_reference_id: reference.id, unit_price });
  if (versionError) throw new Error(versionError.message);

  revalidatePath("/catalog");
}

// Never edits a price in place: update_repair_price() atomically closes the
// current open version's valid_to and inserts a new one, per the "prices
// are never edited" rule.
export async function updateRepairPrice(formData: FormData) {
  const supabase = await createClient();

  const repair_reference_id = String(formData.get("repair_reference_id"));
  const unit_price = Number(formData.get("unit_price"));

  const { error } = await supabase.rpc("update_repair_price", {
    p_repair_reference_id: repair_reference_id,
    p_unit_price: unit_price,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/catalog");
}
