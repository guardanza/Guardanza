"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { validateRut, formatRut } from "@/lib/rut";

// Works out this deployment's own origin from the incoming request instead
// of a hardcoded env var, so the same code redirects correctly whether it's
// running on localhost, a Vercel preview, or production.
async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const fullName = String(formData.get("full_name"));
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/");
}

// Role-first registration: identifies what the person is (arrendador,
// corredor independiente/oficina, or arrendatario) at signup time instead
// of leaving them to figure out "organizations" afterward. Auth user
// creation goes through the normal anon signUp (respects whatever email
// confirmation setting the project has); the organization + admin
// membership are created via the service-role client right after, since
// create_organization() requires an authenticated session that may not
// exist yet if confirmation is pending.
export async function signUpWithRole(formData: FormData) {
  const role = String(formData.get("role"));
  const legal_form = String(formData.get("legal_form") || "");
  const full_name = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const company_name = String(formData.get("company_name") || "").trim();
  const rutInput = String(formData.get("rut") || "").trim();

  const fail = (message: string): never =>
    redirect(`/signup?role=${role}&legal_form=${legal_form}&error=${encodeURIComponent(message)}`);

  if (!["arrendador", "corredor", "arrendatario"].includes(role)) return fail("Selecciona un tipo de cuenta.");
  if (!full_name) return fail("Ingresa tu nombre completo.");
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return fail("La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.");
  }

  let rut: string | null = null;
  if (role === "corredor") {
    if (!company_name) return fail("Ingresa el nombre de tu empresa o corretaje.");
    if (!rutInput || !validateRut(rutInput)) return fail(`El RUT ${rutInput || ""} no es válido.`);
    rut = formatRut(rutInput);
    if (!["persona_natural", "empresa"].includes(legal_form)) return fail("Selecciona corredor independiente u oficina de corretaje.");
  }

  const supabase = await createClient();
  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });
  if (error) return fail(error.message);
  if (!signUpData.user) return fail("No se pudo crear la cuenta.");

  if (role === "arrendador" || role === "corredor") {
    const admin = createServiceRoleClient();
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({
        type: role === "corredor" ? "broker" : "individual",
        name: role === "corredor" ? company_name : `${full_name} (particular)`,
        rut,
        legal_form: role === "corredor" ? legal_form : "persona_natural",
        created_by: signUpData.user.id,
      })
      .select("id")
      .single();
    if (orgError) return fail(orgError.message);

    const { error: memError } = await admin
      .from("memberships")
      .insert({ user_id: signUpData.user.id, organization_id: org.id, role: "admin" });
    if (memError) return fail(memError.message);
  }

  redirect("/");
}

// Redirect-based: Supabase returns a Google consent-screen URL, we send
// the browser there, Google redirects back to /auth/callback with a code
// that route exchanges for a session. Does nothing useful until the
// Google provider is configured in Supabase (Authentication > Providers)
// with a real Client ID/Secret from Google Cloud Console — that part is
// the one piece left for the user to set up themselves.
export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = await siteOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) redirect(`/login?error=${encodeURIComponent(error?.message ?? "No se pudo iniciar sesión con Google.")}`);
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
