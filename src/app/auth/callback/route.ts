import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth (Google, etc.) lands here with a ?code= after the provider redirect.
// exchangeCodeForSession trades it for a real session and sets the cookies
// via the server client's cookie adapter — same session mechanism password
// sign-in uses, so the rest of the app doesn't need to know the difference.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("No se pudo iniciar sesión con Google.")}`);
}
