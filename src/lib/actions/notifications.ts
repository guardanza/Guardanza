"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateNotificationPreferences(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const fields = [
    "contract_signed_email",
    "contract_signed_whatsapp",
    "guarantee_paid_email",
    "guarantee_paid_whatsapp",
    "dispute_opened_email",
    "dispute_opened_whatsapp",
    "proposal_received_email",
    "proposal_received_whatsapp",
  ] as const;

  const values = Object.fromEntries(fields.map((f) => [f, formData.get(f) === "on"]));

  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: userRes.user.id, ...values }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);

  revalidatePath("/notifications");
}
