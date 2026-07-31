import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const METHOD_LABELS: Record<string, string> = {
  email: "correo y contraseña",
  google: "Google",
};

// Cuando alguien intenta entrar (o registrarse) con un método y el email
// ya existe pero solo con el OTRO método asociado, Supabase no lo dice
// con claridad — por diseño, para no filtrar si un email existe o no vía
// el mensaje de error (mismo motivo por el que signUp() responde sin
// error e identities vacío en vez de "ya existe"). Esto llena ese hueco
// con un mensaje que sí lo dice. Devuelve null si no aplica (cuenta no
// existe, o ya tiene ese método) — ahí el error real de Supabase
// (contraseña incorrecta, etc.) sigue siendo el correcto.
export async function crossMethodMessage(email: string, attemptedProvider: "email" | "google"): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) return null;

  const user = data.users.find((u) => u.email === email);
  if (!user) return null;

  const providers = (user.identities ?? []).map((i) => i.provider);
  if (providers.includes(attemptedProvider)) return null;

  const otherProvider = providers.find((p) => p !== attemptedProvider);
  if (!otherProvider) return null;

  const label = METHOD_LABELS[otherProvider] ?? otherProvider;
  return `Este email ya está registrado con ${label}. Inicia sesión con ese método.`;
}
