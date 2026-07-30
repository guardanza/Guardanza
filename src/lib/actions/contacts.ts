"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateRut, formatRut } from "@/lib/rut";

// Paso 2 de Tanda B: cargar/borrar fichas a mano, sin ningún camino de
// email todavía (eso es Paso 3) — user_id y status quedan en su default
// (null / 'pendiente'). RLS (contacts_insert/_delete) ya exige que quien
// llama sea admin de la organización dueña; created_by = auth.uid() se
// fija acá para que coincida con el WITH CHECK de esa policy.
export async function createContact(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const organization_id = String(formData.get("organization_id") || "");
  const contact_role = String(formData.get("contact_role") || "");
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

  const { error } = await supabase.from("contacts").insert({
    organization_id,
    contact_role,
    full_name,
    email,
    rut: formatRut(rut),
    created_by: userRes.user.id,
  });

  if (error) {
    if (error.code === "23505") return fail("Ya tienes un contacto cargado con ese email.");
    return fail(error.message);
  }

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
