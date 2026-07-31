"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { validateRut, formatRut } from "@/lib/rut";
import { assignRoleIfNone, type AssignableRole } from "@/lib/auth/role-assignment";
import { crossMethodMessage } from "@/lib/auth/cross-method";

// Works out this deployment's own origin from the incoming request instead
// of a hardcoded env var, so the same code redirects correctly whether it's
// running on localhost, a Vercel preview, or production.
export async function siteOrigin() {
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
  if (error) {
    // "Contraseña incorrecta" y "esta cuenta es de Google, no tiene
    // contraseña" dan el mismo error genérico de Supabase — sin esto, a
    // alguien que solo tiene cuenta de Google le queda la impresión de que
    // escribió mal su contraseña, cuando en realidad nunca tuvo una.
    const crossMethod = await crossMethodMessage(email, "email");
    redirect(`/login?error=${encodeURIComponent(crossMethod ?? error.message)}`);
  }
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

  // Un email que ya existe se comporta distinto según si "Confirm email"
  // está activado (producción) o no (local, config.toml enable_confirmations
  // = false): con confirmaciones activadas, signUp() responde SIN error e
  // identities vacío (a propósito, para no filtrar por enumeración si un
  // email está registrado); sin confirmaciones, responde con un error
  // explícito ("User already registered", en inglés, sin decir con qué
  // método). Los dos casos se resuelven con el mismo mensaje — sin este
  // chequeo, el código de abajo trataría signUpData.user.id (la cuenta de
  // OTRA persona) como si fuera recién creada, creando una organización
  // fantasma sobre una cuenta ajena.
  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      const crossMethod = await crossMethodMessage(email, "email");
      return fail(crossMethod ?? "Ya existe una cuenta con este email. Inicia sesión en vez de registrarte.");
    }
    return fail(error.message);
  }
  if (!signUpData.user) return fail("No se pudo crear la cuenta.");

  if (signUpData.user.identities && signUpData.user.identities.length === 0) {
    const crossMethod = await crossMethodMessage(email, "email");
    return fail(crossMethod ?? "Ya existe una cuenta con este email. Inicia sesión en vez de registrarte.");
  }

  const { error: roleError } = await assignRoleIfNone({
    userId: signUpData.user.id,
    role: role as AssignableRole,
    legalForm: legal_form,
    companyName: company_name,
    rut,
    fallbackName: full_name,
  });
  if (roleError) return fail(roleError);

  redirect("/");
}

// Redirect-based: Supabase returns a Google consent-screen URL, we send
// the browser there, Google redirects back to /auth/callback with a code
// that route exchanges for a session.
//
// Role-first signup: when the signup wizard calls this with role/legal_form
// (and company_name/rut for corredor) hidden fields, those ride along on
// redirectTo's query string — Supabase preserves it and appends its own
// `code` param, so /auth/callback gets everything it needs to create the
// organization + membership once the OAuth round-trip lands, the same way
// signUpWithRole does for the email path. Plain login (LoginForm) calls
// this with an empty form, so no role param ever reaches the callback —
// fine for a returning user (already has a role, nothing to do), but a
// brand-new email authenticating this way has nothing to fall back on
// either. The callback route is what catches that case now (redirects to
// /choose-role instead of leaving it on the dashboard with no role).
export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const origin = await siteOrigin();

  const role = String(formData.get("role") || "");
  const legal_form = String(formData.get("legal_form") || "");
  const company_name = String(formData.get("company_name") || "").trim();
  const rutInput = String(formData.get("rut") || "").trim();

  const failSignup = (message: string): never =>
    redirect(`/signup?role=${role}&legal_form=${legal_form}&error=${encodeURIComponent(message)}`);

  const callbackUrl = new URL(`${origin}/auth/callback`);
  if (role) {
    if (!["arrendador", "corredor", "arrendatario"].includes(role)) return failSignup("Selecciona un tipo de cuenta.");
    callbackUrl.searchParams.set("role", role);
    if (legal_form) callbackUrl.searchParams.set("legal_form", legal_form);

    if (role === "corredor") {
      if (!company_name) return failSignup("Ingresa el nombre de tu empresa o corretaje.");
      if (!rutInput || !validateRut(rutInput)) return failSignup(`El RUT ${rutInput || ""} no es válido.`);
      if (!["persona_natural", "empresa"].includes(legal_form)) return failSignup("Selecciona corredor independiente u oficina de corretaje.");
      callbackUrl.searchParams.set("company_name", company_name);
      callbackUrl.searchParams.set("rut", formatRut(rutInput));
    }
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl.toString() },
  });
  if (error || !data.url) redirect(`/login?error=${encodeURIComponent(error?.message ?? "No se pudo iniciar sesión con Google.")}`);
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// /choose-role: para una cuenta que YA está autenticada (típicamente
// llegó por el botón de Google de /login, que no pasa role — ver el
// comentario de signInWithGoogle) pero todavía no tiene ningún rol
// asentado. No crea ninguna cuenta nueva ni pide contraseña, solo aplica
// el rol elegido a la sesión que ya existe — mismo assignRoleIfNone que
// usan signUpWithRole y el callback de Google, con la misma garantía de
// no pisar un rol que ya estuviera puesto.
export async function chooseRole(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const role = String(formData.get("role") || "");
  const legal_form = String(formData.get("legal_form") || "");
  const company_name = String(formData.get("company_name") || "").trim();
  const rutInput = String(formData.get("rut") || "").trim();

  const fail = (message: string): never => redirect(`/choose-role?error=${encodeURIComponent(message)}`);

  if (!["arrendador", "corredor", "arrendatario"].includes(role)) return fail("Selecciona un tipo de cuenta.");

  let rut: string | null = null;
  if (role === "corredor") {
    if (!company_name) return fail("Ingresa el nombre de tu empresa o corretaje.");
    if (!rutInput || !validateRut(rutInput)) return fail(`El RUT ${rutInput || ""} no es válido.`);
    rut = formatRut(rutInput);
    if (!["persona_natural", "empresa"].includes(legal_form)) return fail("Selecciona corredor independiente u oficina de corretaje.");
  }

  const fullName = userRes.user.user_metadata?.full_name ?? userRes.user.user_metadata?.name ?? userRes.user.email ?? "";
  const { error: roleError } = await assignRoleIfNone({
    userId: userRes.user.id,
    role: role as AssignableRole,
    legalForm: legal_form,
    companyName: company_name,
    rut,
    fallbackName: fullName,
  });
  if (roleError) return fail(roleError);

  redirect("/");
}
