import { createBrowserClient } from "@supabase/ssr";

// Browser client — anon key only. Subject to RLS on every query.
//
// Untyped for now: database.types.ts is a placeholder until
// `supabase gen types typescript --local` runs against the real schema —
// applying it as the generic here would make every table resolve to
// `never` instead, which is worse than no typing.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
