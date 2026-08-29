import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Al confirmarse una ficha (aceptó la invitación, o se vinculó directo
// porque el email ya tenía cuenta), completa el lado inverso: si la
// persona invitada administra su propia organización (arrendador o
// corredor — un arrendatario nunca tiene una en este modelo), queda
// quien la invitó como contacto confirmado en SU libreta también, y con
// eso también puede ver su foto (ensure_reciprocal_contact + la policy
// nueva de perfiles trabajan juntas — ver la migración). La función SQL
// decide todo lo que depende del esquema (a qué organización, con qué
// rol); acá solo se resuelve lo que ninguna función SQL de este proyecto
// toca directo: el email de quien invitó (auth.users), vía el admin
// client, mismo criterio que findUserIdByEmail.
//
// Nunca lanza: es un efecto secundario de la confirmación, no la
// confirmación en sí — si esto falla, la persona igual queda vinculada
// como contacto (que es lo que de verdad no se puede perder), solo no
// se completa el lado inverso, y se loguea para investigar.
export async function ensureReciprocalContact(contactId: string): Promise<void> {
  const admin = createServiceRoleClient();

  const { data: contact } = await admin.from("contacts").select("created_by").eq("id", contactId).maybeSingle<{ created_by: string }>();
  if (!contact) return;

  const [{ data: userRes }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(contact.created_by),
    admin.from("profiles").select("full_name").eq("id", contact.created_by).maybeSingle<{ full_name: string }>(),
  ]);
  const inviterEmail = userRes?.user?.email;
  if (!inviterEmail) return;

  const { error } = await admin.rpc("ensure_reciprocal_contact", {
    p_contact_id: contactId,
    p_inviter_full_name: profile?.full_name ?? inviterEmail,
    p_inviter_email: inviterEmail,
  });
  if (error) {
    console.error(`[contacts] no se pudo crear el contacto recíproco para ${contactId}: ${error.message}`);
  }
}
