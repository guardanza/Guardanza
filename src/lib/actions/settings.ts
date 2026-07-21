"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const password = String(formData.get("password") || "");
  const fail = (message: string): never => redirect(`/settings?error=${encodeURIComponent(message)}`);
  if (password.length < 6) return fail("La contraseña debe tener al menos 6 caracteres.");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail(error.message);

  redirect("/settings?success=1");
}
