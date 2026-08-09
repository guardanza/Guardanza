import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { RoleBucket } from "@/lib/role-bucket";

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

// Una persona tiene un solo rol en la plataforma (rol_declarado) — esto
// deja detectarlo ANTES de ofrecer invitar, para mostrar "ya está en
// Guardanza como X" en vez de dejar que el intento de invitación falle
// con un error genérico. Service-role porque profiles_select_self_or_shared
// no deja leer el rol de un desconocido sin relación compartida — acá
// justamente se está evaluando si esa relación existe o no.
export async function findAccountRoleByEmail(email: string): Promise<RoleBucket | null> {
  const userId = await findUserIdByEmail(email);
  if (!userId) return null;
  const admin = createServiceRoleClient();
  const { data } = await admin.from("profiles").select("rol_declarado").eq("id", userId).maybeSingle<{ rol_declarado: RoleBucket | null }>();
  return data?.rol_declarado ?? null;
}
