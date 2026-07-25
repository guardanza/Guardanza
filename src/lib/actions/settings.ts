"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthProvider } from "@/lib/auth-provider";

export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const fail = (message: string): never => redirect(`/settings?error=${encodeURIComponent(message)}`);

  // Google accounts have no Guardanza password to change — this route
  // shouldn't even be reachable from that UI, but the server has to refuse
  // it too, since a Google user could otherwise create a parallel
  // password credential that fragments how they can log in.
  if (getAuthProvider(userRes.user) !== "email") return fail("Tu cuenta usa Google — no tienes una contraseña que cambiar acá.");

  const currentPassword = String(formData.get("current_password") || "");
  const newPassword = String(formData.get("new_password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (newPassword !== confirmPassword) return fail("Las contraseñas no coinciden.");
  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return fail("La nueva contraseña debe tener al menos 8 caracteres, una mayúscula y un número.");
  }

  // Re-authenticating with the current password is the only way to verify
  // it without a dedicated Supabase Auth "check password" endpoint — and
  // it's exactly what keeps an open, unattended session from being able to
  // silently take over the account by just setting a new password.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: userRes.user.email!,
    password: currentPassword,
  });
  if (verifyError) return fail("La contraseña actual no es correcta.");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return fail(error.message);

  redirect("/settings?success=1");
}
