"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthProvider } from "@/lib/auth-provider";
import { siteOrigin } from "@/lib/actions/auth";

// Always redirects to the same place with the same generic message,
// whether the email exists, belongs to a Google account, or the send
// itself failed — the only thing that would leak account existence is
// responding differently, so every branch collapses to one outcome.
// The real cooldown between requests is server-side (auth.rate_limit
// max_frequency in config.toml); this is just what the user sees.
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) redirect("/forgot-password");

  const supabase = await createClient();
  const origin = await siteOrigin();

  // Recovery links land on /auth/callback (same code-exchange route
  // Google OAuth uses) with next=/reset-password, so the session that
  // exchangeCodeForSession establishes there is what lets the user set a
  // new password once they land on that page.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });

  redirect(`/forgot-password?sent=${Date.now()}`);
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/reset-password");

  const fail = (message: string): never => redirect(`/reset-password?error=${encodeURIComponent(message)}`);

  // Same defense as changePassword in settings.ts: a Google account has no
  // Guardanza password, and this route existing at all is the one other
  // path (besides the profile page) someone could try to use to bolt a
  // parallel password credential onto a Google account.
  if (getAuthProvider(userRes.user) !== "email") {
    return fail("Tu cuenta usa Google — no tienes una contraseña que restablecer acá.");
  }

  const newPassword = String(formData.get("new_password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (newPassword !== confirmPassword) return fail("Las contraseñas no coinciden.");
  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return fail("La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return fail(error.message);

  redirect("/reset-password?success=1");
}
