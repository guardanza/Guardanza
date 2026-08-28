"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { findUserIdByEmail } from "@/lib/supabase/find-user-by-email";
import { validateRut, formatRut } from "@/lib/rut";
import { assignRoleIfNone } from "@/lib/auth/role-assignment";
import type { RoleBucket } from "@/lib/role-bucket";

function inviteFail(token: string, message: string): never {
  redirect(`/invite/${token}?error=${encodeURIComponent(message)}`);
}

// Rechazo explícito — el token sigue siendo la única credencial (mismo
// modelo de confianza que resolve_contact_invite, nunca requiere sesión),
// así que esto llama al RPC con el cliente normal (anon key), sin pasar
// por el service-role client: no hace falta resolver ningún user_id,
// rechazar no crea ni vincula ninguna cuenta. reject_contact_invite()
// nunca lanza excepción por sí sola (ok=false es un resultado normal,
// mismo patrón que confirm_contact_invite ante un rol distinto) — el
// único motivo por el que esto termina en inviteFail es un token que ya
// no matchea nada (vencido, ya usado, ya rechazado antes).
export async function rejectContactInvite(formData: FormData) {
  const token = String(formData.get("token") || "");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("reject_contact_invite", { p_token: token }).single<{ ok: boolean }>();

  if (error || !data?.ok) {
    return inviteFail(token, "Esta invitación ya no es válida — puede que ya se haya usado o vencido.");
  }

  redirect(`/invite/${token}?rejected=1`);
}

// El camino "el email del token ya tiene cuenta" — no se pide contraseña
// ni nada, el token ya es la prueba de identidad. confirm_contact_invite
// re-chequea la regla de rol server-side (camino 3 al confirmar); si la
// persona se registró con otro rol entre la carga y ahora, se rechaza acá
// con el mismo mensaje que en Paso 3/4.
export async function linkExistingAccountInvite(formData: FormData) {
  const token = String(formData.get("token") || "");
  const email = String(formData.get("email") || "");

  const target_user_id = await findUserIdByEmail(email);
  if (!target_user_id) return inviteFail(token, "No encontramos ninguna cuenta con ese email.");

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .rpc("confirm_contact_invite", { p_token: token, p_target_user_id: target_user_id })
    .single<{ ok: boolean }>();

  if (error) return inviteFail(token, "Esta invitación ya no es válida — pídele a quien te invitó que la reenvíe.");
  if (!data.ok) {
    return inviteFail(token, "Ya tienes una cuenta de Guardanza con otro rol — no te podemos vincular a esta invitación.");
  }

  redirect("/login?confirmed=1");
}

// El camino "sin cuenta todavía" — crea la cuenta (signUp normal, misma
// política de contraseña que el resto del signup) y recién ahí confirma.
// El nombre y el RUT los define la PERSONA acá, no lo que tipeó quien
// cargó la ficha originalmente — email es lo único que no se puede tocar,
// es la identidad que ancla el token.
export async function acceptContactInvite(formData: FormData) {
  const token = String(formData.get("token") || "");
  const email = String(formData.get("email") || "");
  const full_name = String(formData.get("full_name") || "").trim();
  const rutInput = String(formData.get("rut") || "").trim();
  const password = String(formData.get("password") || "");

  if (!full_name) return inviteFail(token, "Ingresa tu nombre completo.");
  if (!validateRut(rutInput)) return inviteFail(token, "El RUT ingresado no es válido.");
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return inviteFail(token, "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.");
  }

  const supabase = await createClient();

  // contact_role se resuelve del propio token (mismo RPC anon-safe que ya
  // usa la pantalla para mostrarlo) — nunca de un campo que viniera del
  // formulario, para no confiar en nada que alguien pudiera manipular
  // antes del signUp.
  const { data: invite } = await supabase
    .rpc("resolve_contact_invite", { p_token: token })
    .maybeSingle<{ contact_role: RoleBucket }>();
  if (!invite) return inviteFail(token, "Esta invitación ya no es válida — pídele a quien te invitó que la reenvíe.");

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });
  if (signUpError) return inviteFail(token, signUpError.message);
  if (!signUpData.user) return inviteFail(token, "No se pudo crear la cuenta.");

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name, rut: formatRut(rutInput) })
    .eq("id", signUpData.user.id);
  if (profileError) {
    if (profileError.code === "23505") return inviteFail(token, "Ese RUT ya está registrado en otra cuenta de Guardanza.");
    return inviteFail(token, profileError.message);
  }

  // Mismo puente organización↔persona que usa el alta normal
  // (signUpWithRole/el callback de Google, ambos vía assignRoleIfNone) —
  // sin esto, aceptar una invitación dejaba la cuenta confirmada pero sin
  // organización, así que nunca se podía resolver como arrendador/
  // corredor real (resolve_contact_organization). Va ANTES de
  // confirm_contact_invite a propósito: ese RPC ya deja rol_declarado
  // seteado, y assignRoleIfNone no hace nada si detecta que la cuenta ya
  // tiene un rol asentado — llamarlo después sería un no-op. Un
  // corredor invitado (sin nombre de corretaje pedido en esta pantalla,
  // a diferencia del alta normal) queda como corredor independiente,
  // mismo criterio que ya usa un arrendador invitado ("Nombre
  // (particular)").
  if (invite.contact_role === "arrendador" || invite.contact_role === "corredor") {
    const { error: roleAssignError } = await assignRoleIfNone({
      userId: signUpData.user.id,
      role: invite.contact_role,
      legalForm: invite.contact_role === "corredor" ? "persona_natural" : undefined,
      companyName: invite.contact_role === "corredor" ? `${full_name} (corredor)` : undefined,
      rut: formatRut(rutInput),
      fallbackName: full_name,
    });
    if (roleAssignError) {
      console.error(`[contact-invites] no se pudo crear la organización para ${signUpData.user.id}: ${roleAssignError}`);
    }
  }

  const admin = createServiceRoleClient();
  const { data, error: confirmError } = await admin
    .rpc("confirm_contact_invite", { p_token: token, p_target_user_id: signUpData.user.id })
    .single<{ ok: boolean }>();

  // La cuenta ya quedó creada (con sesión activa) aunque falle la
  // confirmación de acá para abajo — no la deshacemos, la persona puede
  // seguir usando Guardanza normalmente, solo no queda vinculada a esta
  // ficha.
  if (confirmError) return inviteFail(token, "Esta invitación ya no es válida — pídele a quien te invitó que la reenvíe.");
  if (!data.ok) {
    return inviteFail(token, "Ya tienes una cuenta de Guardanza con otro rol — no te podemos vincular a esta invitación.");
  }

  redirect("/bienvenida");
}
