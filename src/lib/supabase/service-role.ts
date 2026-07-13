import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// service_role key — bypasses RLS entirely. `server-only` makes it a build
// error to import this from anything that could end up in a client bundle.
// Use only for the handful of operations that genuinely need to bypass RLS
// (there should be very few — most writes go through the SECURITY DEFINER
// Postgres functions instead, which do their own authorization check).
//
// Untyped for now — see the note in client.ts about database.types.ts.
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
