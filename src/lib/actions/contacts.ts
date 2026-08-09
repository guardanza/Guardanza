"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateRut, formatRut } from "@/lib/rut";
import { findUserIdByEmail } from "@/lib/supabase/find-user-by-email";
import { roleBucketLabel, type RoleBucket } from "@/lib/role-bucket";
import { siteOrigin } from "@/lib/actions/auth";
import { emailProvider } from "@/lib/adapters/email";
import { isValidEmail, deriveNameFromEmail } from "@/lib/email";

type InviteOutcome = { linked: true } | { linked: false } | { linked: false; failed: true; message: string };

// issue_contact_invite() hace su propio chequeo de is_org_admin, de que
// el contacto siga pendiente, y — cuando se le pasa targetUserId (solo en
// reenvíos, ver resendContactInvite) — la misma regla de rol del camino 3
// (mismo rol o rechazo, nunca una cuenta con otro rol ni de platform
// admin). Acá solo se interpreta el resultado: si linked=true, la persona
// ya se había registrado y quedó vinculada directo, sin correo. Si
// linked=false, arma el link y llama al adapter — un fallo del ENVÍO en
// sí (no del RPC) no tumba nada más: se loguea y la persona igual puede
// reenviar desde /contacts.
async function issueInviteOrLink(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contactId: string,
  fullName: string,
  email: string,
  organizationName: string,
  contactRole: RoleBucket,
  targetUserId: string | null
): Promise<InviteOutcome> {
  const { data: invite, error } = await supabase
    .rpc("issue_contact_invite", { p_contact_id: contactId, p_target_user_id: targetUserId })
    .single<{ linked: boolean; raw_token: string | null; expires_at: string | null }>();

  if (error || !invite) {
    if (error?.message.includes("resend_cooldown")) {
      return { linked: false, failed: true, message: "Espera un momento antes de reenviar de nuevo." };
    }
    if (error?.message.includes("contact_role_mismatch")) {
      return {
        linked: false,
        failed: true,
        message: `Esta persona ya se registró en Guardanza con otro rol — no se puede vincular como ${roleBucketLabel(contactRole)}.`,
      };
    }
    console.error(`[contacts] no se pudo emitir la invitación para ${contactId}: ${error?.message}`);
    return { linked: false, failed: true, message: error?.message ?? "No se pudo procesar la invitación." };
  }

  if (invite.linked) return { linked: true };

  const origin = await siteOrigin();
  const acceptUrl = `${origin}/invite/${invite.raw_token}`;

  try {
    await emailProvider.sendContactInvite({
      to: email,
      contactFullName: fullName,
      organizationName,
      contactRoleLabel: roleBucketLabel(contactRole),
      acceptUrl,
      expiresAt: new Date(invite.expires_at!),
    });
  } catch (e) {
    console.error(`[contacts] no se pudo enviar el email de invitación para ${contactId}:`, e);
  }
  return { linked: false };
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
    // target_user_id ya se resolvió como null más arriba (por eso quedó
    // pendiente) — la emisión inicial nunca pasa por la rama de vínculo
    // directo, solo el reenvío la re-chequea.
    const { data: org } = await supabase.from("organizations").select("name").eq("id", organization_id).single();
    await issueInviteOrLink(supabase, contact.id, full_name, email, org?.name ?? "Guardanza", contact_role, null);
  }

  redirect("/contacts");
}

// Reenviar: puede pasar de dos formas. Si el email sigue sin cuenta,
// issue_contact_invite pisa el token anterior con uno nuevo (7 días desde
// ahora) y se manda el correo de nuevo — nada se duplica. Pero si la
// persona se registró por su cuenta desde que se cargó/reenvió la última
// vez, se re-resuelve el email acá mismo y se vincula directo (mismo
// criterio de rol que el camino 3: solo si coincide, si no se rechaza) —
// ya no tiene sentido mandarle otra invitación a alguien que ya está
// adentro.
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
  const target_user_id = await findUserIdByEmail(contact.email);

  const outcome = await issueInviteOrLink(
    supabase,
    id,
    contact.full_name,
    contact.email,
    org?.name ?? "Guardanza",
    contact.contact_role,
    target_user_id
  );

  revalidatePath("/contacts");

  if ("failed" in outcome && outcome.failed) {
    redirect(`/contacts?error=${encodeURIComponent(outcome.message)}`);
  }
  if (outcome.linked) {
    redirect(`/contacts?linked=${encodeURIComponent(contact.full_name)}`);
  }
  redirect("/contacts");
}

// Invitación rápida desde el estado "sin resultados" de la búsqueda de
// Mis Contactos — mismo load_contact()/issue_contact_invite() de
// siempre, la misma invitación real que ya existía, solo un camino más
// corto para llegar a ella: sin pedir nombre ni RUT. El nombre es un
// placeholder derivado del email (igual que en el resto de la libreta,
// el nombre real lo define la PERSONA al confirmar su cuenta) y el RUT
// queda vacío, se completa después. organization_id no viaja del
// cliente — se resuelve acá mismo contra la propia membership de admin
// (load_contact igual la re-valida con is_org_admin, pero así ni
// siquiera hace falta un campo oculto que alguien podría manipular).
export async function quickInviteContact(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const tab = String(formData.get("tab") || "arrendador") as RoleBucket;
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  const fail = (message: string): never =>
    redirect(`/contacts?tab=${tab}&q=${encodeURIComponent(email)}&error=${encodeURIComponent(message)}`);

  if (!isValidEmail(email)) return fail("Ingresa un email válido.");

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id, organizations(name)")
    .eq("role", "admin")
    .maybeSingle<{ organization_id: string; organizations: { name: string } | { name: string }[] | null }>();
  if (!membership) return fail("Necesitas administrar una organización para invitar contactos.");

  const org = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;
  const full_name = deriveNameFromEmail(email);
  const target_user_id = await findUserIdByEmail(email);

  const { data: contact, error } = await supabase
    .rpc("load_contact", {
      p_organization_id: membership.organization_id,
      p_contact_role: tab,
      p_full_name: full_name,
      p_email: email,
      p_rut: null,
      p_target_user_id: target_user_id,
    })
    .single<{ id: string; status: string }>();

  if (error) {
    if (error.code === "23505") return fail("Ya tienes un contacto cargado con ese email.");
    if (error.message.includes("contact_role_mismatch")) {
      return fail(`Ese email ya pertenece a una cuenta de Guardanza con otro rol — no se puede invitar como ${roleBucketLabel(tab)}.`);
    }
    return fail(error.message);
  }

  revalidatePath("/contacts");

  if (contact?.status === "confirmado") {
    redirect(`/contacts?tab=${tab}&linked=${encodeURIComponent(full_name)}`);
  }

  // target_user_id ya se resolvió como null más arriba (por eso quedó
  // pendiente) — la emisión inicial nunca pasa por la rama de vínculo
  // directo, solo el reenvío la re-chequea.
  await issueInviteOrLink(supabase, contact.id, full_name, email, org?.name ?? "Guardanza", tab, null);

  redirect(`/contacts?tab=${tab}&invited=${encodeURIComponent(email)}`);
}

export async function deleteContact(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) redirect(`/contacts?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/contacts");
  redirect("/contacts");
}
