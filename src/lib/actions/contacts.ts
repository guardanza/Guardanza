"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateRut, formatRut } from "@/lib/rut";
import { findUserIdByEmail } from "@/lib/supabase/find-user-by-email";
import { roleBucketLabel, type RoleBucket } from "@/lib/role-bucket";

// Paso 3 de Tanda B: los tres caminos viven enteros dentro de
// load_contact() (security definer) — acá solo se resuelve el email a un
// user_id (o null) vía el admin client, exactamente como el resto del
// código ya hace en los otros call sites de "¿existe una cuenta con este
// email?", y se le pasa a la función.
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
    .single<{ status: string }>();

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
