"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateRut, formatRut } from "@/lib/rut";
import { findUserIdByEmail } from "@/lib/supabase/find-user-by-email";
import { roleBucketLabel, type RoleBucket } from "@/lib/role-bucket";
import { siteOrigin } from "@/lib/actions/auth";
import { emailProvider } from "@/lib/adapters/email";

// issue_contact_invite() ya hace su propio chequeo de is_org_admin y de
// que el contacto siga pendiente — acá solo arma el link y llama al
// adapter. Si el envío en sí fallara, no tumbamos la carga del contacto
// (que ya quedó guardada): se loguea y la persona igual puede reenviar
// desde /contacts. El mock nunca falla en la práctica, pero un provider
// real sí podría.
async function issueAndSendInvite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contactId: string,
  fullName: string,
  email: string,
  organizationName: string,
  contactRole: RoleBucket
) {
  const { data: invite, error } = await supabase
    .rpc("issue_contact_invite", { p_contact_id: contactId })
    .single<{ raw_token: string; expires_at: string }>();
  if (error || !invite) {
    console.error(`[contacts] no se pudo emitir la invitación para ${contactId}: ${error?.message}`);
    return;
  }

  const origin = await siteOrigin();
  const acceptUrl = `${origin}/invite/${invite.raw_token}`;

  try {
    await emailProvider.sendContactInvite({
      to: email,
      contactFullName: fullName,
      organizationName,
      contactRoleLabel: roleBucketLabel(contactRole),
      acceptUrl,
      expiresAt: new Date(invite.expires_at),
    });
  } catch (e) {
    console.error(`[contacts] no se pudo enviar el email de invitación para ${contactId}:`, e);
  }
}

// Paso 3/4 de Tanda B: los tres caminos viven enteros dentro de
// load_contact() (security definer) — acá solo se resuelve el email a un
// user_id (o null) vía el admin client, exactamente como el resto del
// código ya hace en los otros call sites de "¿existe una cuenta con este
// email?", y se le pasa a la función. Camino 1 (queda pendiente) dispara
// además la invitación real — token propio, emitido por
// issue_contact_invite(), enviado por el adapter de email (mock por ahora).
export async function createContact(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const organization_id = String(formData.get("organization_id") || "");
  const contact_role = String(formData.get("contact_role") || "") as RoleBucket;
  const full_name = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const rut = String(formData.get("rut") || "").trim();

  const fail = (message: string): never =>
    redirect(`/contacts/new?organization_id=${organization_id}&error=${encodeURIComponent(message)}`);

  if (!full_name) return fail("Ingresa el nombre del contacto.");
  if (!email) return fail("Ingresa el email del contacto.");
  if (!validateRut(rut)) return fail("El RUT ingresado no es válido.");

  const target_user_id = await findUserIdByEmail(email);

  const { data: contact, error } = await supabase
    .rpc("load_contact", {
      p_organization_id: organization_id,
      p_contact_role: contact_role,
      p_full_name: full_name,
      p_email: email,
      p_rut: formatRut(rut),
      p_target_user_id: target_user_id,
    })
    .single<{ id: string; status: string }>();

  if (error) {
    if (error.code === "23505") return fail("Ya tienes un contacto cargado con ese email.");
    if (error.message.includes("contact_role_mismatch")) {
      return fail(
        `Ese email ya pertenece a una cuenta de Guardanza con otro rol — no se puede cargar como ${roleBucketLabel(contact_role)}.`
      );
    }
    return fail(error.message);
  }

  revalidatePath("/contacts");

  if (contact?.status === "confirmado") {
    redirect(`/contacts?linked=${encodeURIComponent(full_name)}`);
  }

  if (contact?.status === "pendiente") {
    const { data: org } = await supabase.from("organizations").select("name").eq("id", organization_id).single();
    await issueAndSendInvite(supabase, contact.id, full_name, email, org?.name ?? "Guardanza", contact_role);
  }

  redirect("/contacts");
}

// Reenviar: misma operación que la invitación inicial — issue_contact_invite
// pisa el token anterior con uno nuevo (7 días desde ahora), nada se
// duplica (misma fila de contacts, mismo — ausente — user_id).
export async function resendContactInvite(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const id = String(formData.get("id"));

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("full_name, email, contact_role, organizations(name)")
    .eq("id", id)
    .single<{ full_name: string; email: string; contact_role: RoleBucket; organizations: { name: string } | { name: string }[] | null }>();
  if (contactError || !contact) redirect(`/contacts?error=${encodeURIComponent("No se encontró el contacto.")}`);

  const org = Array.isArray(contact.organizations) ? contact.organizations[0] : contact.organizations;

  await issueAndSendInvite(supabase, id, contact.full_name, contact.email, org?.name ?? "Guardanza", contact.contact_role);

  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function deleteContact(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) redirect(`/contacts?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/contacts");
  redirect("/contacts");
}
