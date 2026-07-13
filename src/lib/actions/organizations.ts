"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createOrganization(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const type = String(formData.get("type"));
  const name = String(formData.get("name"));

  const { data: org, error } = await supabase
    .rpc("create_organization", { p_type: type, p_name: name, p_actor_user_id: userRes.user!.id })
    .single<{ id: string }>();

  if (error) throw new Error(error.message);

  redirect(`/properties/new?organization_id=${org.id}`);
}
