import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// OAuth (Google, etc.) lands here with a ?code= after the provider redirect.
// exchangeCodeForSession trades it for a real session and sets the cookies
// via the server client's cookie adapter — same session mechanism password
// sign-in uses, so the rest of the app doesn't need to know the difference.
//
// role/legal_form/company_name/rut only show up here when signInWithGoogle
// was called from the signup wizard (see auth.ts) — plain login never sets
// them, so this block is a no-op for a normal sign-in. Guarded by "does
// this user already have a membership" so a returning user re-authenticating
// with Google never gets a second organization created for them.
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
      if (role === "arrendador" || role === "corredor") {
        const admin = createServiceRoleClient();
        const { data: existingMemberships } = await admin.from("memberships").select("id").eq("user_id", data.user.id).limit(1);

        if (!existingMemberships || existingMemberships.length === 0) {
          const fullName = data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? data.user.email ?? "";
          const { data: org, error: orgError } = await admin
            .from("organizations")
            .insert({
              type: role === "corredor" ? "broker" : "individual",
              name: role === "corredor" ? company_name : `${fullName} (particular)`,
              rut,
              legal_form: role === "corredor" ? legal_form : "persona_natural",
              created_by: data.user.id,
            })
            .select("id")
            .single();

          if (!orgError && org) {
            await admin.from("memberships").insert({ user_id: data.user.id, organization_id: org.id, role: "admin" });
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("No se pudo iniciar sesión con Google.")}`);
}
