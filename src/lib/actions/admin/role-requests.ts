"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { validateRut, formatRut } from "@/lib/rut";

const PANEL_PATH = "/admin/solicitudes-rol";

function orgFields(formData: FormData, rolNuevo: string) {
  const org_name = String(formData.get("org_name") || "").trim();
  const org_rut_raw = String(formData.get("org_rut") || "").trim();
  const org_legal_form = String(formData.get("org_legal_form") || "");
  return {
    p_org_name: org_name || null,
    p_org_rut: rolNuevo === "corredor" && org_rut_raw ? formatRut(org_rut_raw) : org_rut_raw || null,
    p_org_legal_form: rolNuevo === "corredor" ? org_legal_form || null : null,
  };
}

export async function approveRoleRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const solicitud_id = String(formData.get("solicitud_id") || "");
  const rol_solicitado = String(formData.get("rol_solicitado") || "");
  const fail = (message: string): never => redirect(`${PANEL_PATH}?error=${encodeURIComponent(message)}`);

  if (rol_solicitado === "corredor") {
    const rutRaw = String(formData.get("org_rut") || "").trim();
    if (rutRaw && !validateRut(rutRaw)) return fail(`El RUT ${rutRaw} no es válido.`);
  }

  const { p_org_name, p_org_rut, p_org_legal_form } = orgFields(formData, rol_solicitado);

  const { error } = await supabase.rpc("resolver_solicitud_rol", {
    p_solicitud_id: solicitud_id,
    p_aprobar: true,
    p_org_name,
    p_org_rut,
    p_org_legal_form,
  });
  if (error) return fail(error.message);

  revalidatePath(PANEL_PATH);
  revalidatePath("/profile");
  redirect(`${PANEL_PATH}?success=aprobada`);
}

export async function rejectRoleRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const solicitud_id = String(formData.get("solicitud_id") || "");
  const motivo_rechazo = String(formData.get("motivo_rechazo") || "").trim();
  const fail = (message: string): never => redirect(`${PANEL_PATH}?error=${encodeURIComponent(message)}`);

  const { error } = await supabase.rpc("resolver_solicitud_rol", {
    p_solicitud_id: solicitud_id,
    p_aprobar: false,
    p_motivo_rechazo: motivo_rechazo || null,
  });
  if (error) return fail(error.message);

  revalidatePath(PANEL_PATH);
  revalidatePath("/profile");
  redirect(`${PANEL_PATH}?success=rechazada`);
}

export async function changeRoleDirect(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const email = String(formData.get("email") || "").trim();
  const rol_nuevo = String(formData.get("rol_nuevo") || "");
  const motivo = String(formData.get("motivo") || "").trim();
  const fail = (message: string): never => redirect(`${PANEL_PATH}?error=${encodeURIComponent(message)}`);

  if (!email) return fail("Ingresa el email del usuario.");
  if (!["arrendador", "corredor", "arrendatario"].includes(rol_nuevo)) return fail("Selecciona un rol válido.");

  if (rol_nuevo === "corredor") {
    const rutRaw = String(formData.get("org_rut") || "").trim();
    if (rutRaw && !validateRut(rutRaw)) return fail(`El RUT ${rutRaw} no es válido.`);
  }

  // profiles has no email column (it lives on auth.users) — same
  // admin.listUsers() lookup pattern used elsewhere in the app to
  // resolve an email to an account (see findUserIdByEmail).
  const admin = createServiceRoleClient();
  const { data: usersPage, error: lookupError } = await admin.auth.admin.listUsers();
  if (lookupError) return fail(lookupError.message);
  const targetUser = usersPage.users.find((u) => u.email === email);
  if (!targetUser) return fail(`No existe una cuenta con el email ${email}.`);

  const { p_org_name, p_org_rut, p_org_legal_form } = orgFields(formData, rol_nuevo);

  const { error } = await supabase.rpc("cambiar_rol_admin_directo", {
    p_target_user_id: targetUser.id,
    p_rol_nuevo: rol_nuevo,
    p_motivo: motivo || null,
    p_org_name,
    p_org_rut,
    p_org_legal_form,
  });
  if (error) return fail(error.message);

  revalidatePath(PANEL_PATH);
  // A direct change has no solicitud row to attach a "ver historial" link
  // to anywhere else in the panel — carry the target id through so the
  // success message itself can link straight to their filtered history.
  redirect(`${PANEL_PATH}?success=directo&target_user_id=${targetUser.id}`);
}
