import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server client (route handlers, server components, server actions) — anon
// key, acts as the signed-in user via their session cookie. Subject to RLS.
//
// Untyped for now — see the note in client.ts about database.types.ts.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component with no request context to mutate —
            // safe to ignore as long as middleware refreshes the session.
          }
        },
      },
    }
  );
}
