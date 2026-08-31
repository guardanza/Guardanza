"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { findUserIdByEmail } from "@/lib/supabase/find-user-by-email";

function inviteFail(token: string, message: string): never {
  redirect(`/evaluacion/${token}?error=${encodeURIComponent(message)}`);
}

// El camino "el email del token ya tiene cuenta" — a diferencia de
// contacts, acá el token NUNCA vincula solo (no hay "ya está en
// Guardanza, se agrega directo sin que la persona haga nada"): esta
// acción SIEMPRE es la propia persona, ya logueada o iniciando sesión,
// confirmando explícitamente que participa de esta postulación. El
// consentimiento es el punto — sobre todo para un codeudor.
export async function linkExistingAccountCandidateParticipant(formData: FormData) {
  const token = String(formData.get("token") || "");
  const email = String(formData.get("email") || "");

  const target_user_id = await findUserIdByEmail(email);
  if (!target_user_id) return inviteFail(token, "No encontramos ninguna cuenta con ese email.");

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .rpc("confirm_candidate_participant_invite", { p_token: token, p_target_user_id: target_user_id })
    .single<{ ok: boolean; candidate_participant: { id: string } }>();

  if (error) return inviteFail(token, "Este link ya no es válido — pídele a quien te invitó que te lo reenvíe.");
  if (!data.ok) {
    return inviteFail(token, "Esta cuenta no puede vincularse a esta postulación.");
  }

  // Esta acción nunca abre sesión (mismo modelo de confianza que
  // contacts: el token ya probó la identidad, no hace falta la
  // contraseña para CONFIRMAR) — pero para VER la postulación después
  // sí hace falta sesión. next lleva de vuelta ahí apenas inicie sesión.
  redirect(`/login?confirmed=evaluacion&next=${encodeURIComponent(`/evaluacion/postulacion/${data.candidate_participant.id}`)}`);
}

// El camino "sin cuenta todavía" — crea la cuenta y recién ahí confirma,
// mismo patrón que acceptContactInvite (createUser con email_confirm
// directo: el token YA es la prueba de que esta persona controla ese
// email, así que pedirle además que confirme por correo es redundante).
//
// Diferencia clave con acceptContactInvite: NO llama assignRoleIfNone.
// Un codeudor o coarrendatario no está tomando un rol de mercado
// (arrendador/arrendatario/corredor) — solo participa de esta
// postulación puntual. Tampoco se pide RUT acá: eso lo levanta el
// flujo guiado (Etapa 3, pantalla de identidad), no esta pantalla de
// aterrizaje.
export async function acceptCandidateParticipantInvite(formData: FormData) {
  const token = String(formData.get("token") || "");
  const full_name = String(formData.get("full_name") || "").trim();
  const password = String(formData.get("password") || "");

  if (!full_name) return inviteFail(token, "Ingresa tu nombre completo.");
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return inviteFail(token, "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.");
  }

  const supabase = await createClient();

  // email se resuelve del propio token (mismo RPC anon-safe que ya usa
  // la pantalla para mostrarlo) — nunca de un campo que viniera del
  // formulario, mismo criterio que acceptContactInvite.
  const { data: invite } = await supabase
    .rpc("resolve_candidate_participant_invite", { p_token: token })
    .maybeSingle<{ email: string }>();
  if (!invite) return inviteFail(token, "Este link ya no es válido — pídele a quien te invitó que te lo reenvíe.");

  const admin = createServiceRoleClient();
  const { data: createData, error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (createError) return inviteFail(token, createError.message);
  if (!createData.user) return inviteFail(token, "No se pudo crear la cuenta.");
  const newUser = createData.user;

  const { error: signInError } = await supabase.auth.signInWithPassword({ email: invite.email, password });
  if (signInError) return inviteFail(token, signInError.message);

  const { error: profileError } = await supabase.from("profiles").update({ full_name }).eq("id", newUser.id);
  if (profileError) return inviteFail(token, profileError.message);

  const { data, error: confirmError } = await admin
    .rpc("confirm_candidate_participant_invite", { p_token: token, p_target_user_id: newUser.id })
    .single<{ ok: boolean; candidate_participant: { id: string } }>();

  // La cuenta ya quedó creada (con sesión activa) aunque falle la
  // confirmación de acá para abajo — no la deshacemos, mismo criterio
  // que acceptContactInvite.
  if (confirmError) return inviteFail(token, "Este link ya no es válido — pídele a quien te invitó que te lo reenvíe.");
  if (!data.ok) {
    return inviteFail(token, "Esta cuenta no puede vincularse a esta postulación.");
  }

  // Ya quedó con sesión activa (signInWithPassword más arriba) — directo
  // al flujo guiado, sin pasar por /login.
  redirect(`/evaluacion/postulacion/${data.candidate_participant.id}`);
}
