import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Resolves an email to an existing auth.users id, or null if no account
// has that email yet. Centralizes the admin.listUsers()+find() pattern
// used for the contact-book's three email paths — kept separate from the
// other pre-existing call sites (addPropertyTenant, createContract,
// role-requests) that repeat this same lookup, since refactoring those is
// out of scope here.
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw new Error(error.message);
  return data.users.find((u) => u.email === email)?.id ?? null;
}
