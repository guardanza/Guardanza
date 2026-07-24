import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE_NAME, gateTokenFor } from "@/lib/gate";

// Blocks the whole site behind a shared password while it's still in
// progress — checked here, server-side, before any route renders, so it
// actually keeps people out (a client-side "enter password" overlay would
// still ship the real page HTML to the browser first, which defeats the
// point). GATE_PASSWORD unset means the gate is off (e.g. local dev without
// it configured), not "block everyone".
function checkGate(request: NextRequest): NextResponse | null {
  const expected = process.env.GATE_PASSWORD;
  if (!expected) return null;

  const cookie = request.cookies.get(GATE_COOKIE_NAME);
  if (cookie?.value === gateTokenFor(expected)) return null;

  const url = new URL("/gate", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const gateRedirect = checkGate(request);
  if (gateRedirect) return gateRedirect;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Refreshes the session cookie if needed — required for server components
  // to see a valid session.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!gate|_next/static|_next/image|favicon.ico|apple-icon.png|icon.png|robots.txt|sitemap.xml).*)"],
};
