import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assignRoleIfNone, type AssignableRole } from "@/lib/auth/role-assignment";
import { getProfileTypeLabel } from "@/lib/profile-label";

// OAuth (Google, etc.) lands here with a ?code= after the provider redirect.
// exchangeCodeForSession trades it for a real session and sets the cookies
// via the server client's cookie adapter — same session mechanism password
// sign-in uses, so the rest of the app doesn't need to know the difference.
//
// role/legal_form/company_name/rut only show up here when signInWithGoogle
// was called from the signup wizard (see auth.ts) — plain login (LoginForm)
// calls this with an empty form, so role is never set there. assignRoleIfNone
// no-ops for anyone who already has a role (existing membership OR
// rol_declarado) — a returning user re-authenticating with Google, by
// either button, never gets a second organization or an overwritten role.
//
// The check at the bottom (still "Sin rol definido" after all that) is what
// actually closes the bug this file used to have: a brand-new email that
// authenticates via the plain /login Google button has no role param, so
// none of the branches above ever ran for it — it used to land on the
// dashboard with rol_declarado still null. Now it lands on /choose-role
// instead, whether it got there via /login or /signup.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const role = searchParams.get("role");
  const legal_form = searchParams.get("legal_form") ?? "";
  const company_name = searchParams.get("company_name") ?? "";
  const rut = searchParams.get("rut");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Backfill the Google photo as a default avatar — only when the
      // profile doesn't have one yet, so this never clobbers a photo the
      // user uploaded themselves. Runs on every Google login (not just
      // signup) so it also catches accounts created before this existed.
      const googleAvatarUrl = data.user.user_metadata?.avatar_url ?? data.user.user_metadata?.picture ?? null;
      if (googleAvatarUrl) {
        const { data: existingProfile } = await supabase.from("profiles").select("avatar_url").eq("id", data.user.id).single();
        if (existingProfile && !existingProfile.avatar_url) {
          await supabase.from("profiles").update({ avatar_url: googleAvatarUrl }).eq("id", data.user.id);
        }
      }

      if (role === "arrendador" || role === "corredor" || role === "arrendatario") {
        const fullName = data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? data.user.email ?? "";
        await assignRoleIfNone({
          userId: data.user.id,
          role: role as AssignableRole,
          legalForm: legal_form,
          companyName: company_name,
          rut,
          fallbackName: fullName,
        });
      }

      const profileType = await getProfileTypeLabel(supabase, data.user.id);
      if (profileType === "Sin rol definido") {
        return NextResponse.redirect(`${origin}/choose-role`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // A password-recovery link (see requestPasswordReset in
  // password-reset.ts) also lands here — if the code exchange failed
  // (expired or already-used link), send it on to /reset-password so that
  // page can show its own "this link expired" message instead of a
  // Google-flavored error that makes no sense for this flow.
  if (next.startsWith("/reset-password")) return NextResponse.redirect(`${origin}${next}`);

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("No se pudo iniciar sesión con Google.")}`);
}
