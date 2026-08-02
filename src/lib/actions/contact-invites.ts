"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { findUserIdByEmail } from "@/lib/supabase/find-user-by-email";
import { validateRut, formatRut } from "@/lib/rut";

function inviteFail(token: string, message: string): never {
  redirect(`/invite/${token}?error=${encodeURIComponent(message)}`);
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

  if (error) return inviteFail(token, "Esta invitación ya no es válida — pedile a quien te invitó que la reenvíe.");
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

  const admin = createServiceRoleClient();
  const { data, error: confirmError } = await admin
    .rpc("confirm_contact_invite", { p_token: token, p_target_user_id: signUpData.user.id })
    .single<{ ok: boolean }>();

  // La cuenta ya quedó creada (con sesión activa) aunque falle la
  // confirmación de acá para abajo — no la deshacemos, la persona puede
  // seguir usando Guardanza normalmente, solo no queda vinculada a esta
  // ficha.
  if (confirmError) return inviteFail(token, "Esta invitación ya no es válida — pedile a quien te invitó que la reenvíe.");
  if (!data.ok) {
    return inviteFail(token, "Ya tienes una cuenta de Guardanza con otro rol — no te podemos vincular a esta invitación.");
  }

  redirect("/");
}
