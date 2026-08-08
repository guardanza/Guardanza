"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Candidatos (Tanda D Fase 1): un candidato es un contacto arrendatario
// de la libreta (Tanda B) vinculado a una propiedad — no una entidad
// nueva ni un mecanismo de invitación nuevo. La RLS de
// property_candidates ya valida que el contacto sea arrendatario de la
// misma organización dueña o corredora, y el trigger
// property_candidates_block_if_occupied ya bloquea agregar o reactivar
// candidatos si la propiedad tiene un contrato sin terminar — acá solo
// se interpretan los errores que puedan devolver.
export async function addPropertyCandidate(formData: FormData) {
  const supabase = await createClient();
  const property_id = String(formData.get("property_id"));
  const contact_id = String(formData.get("contact_id") || "");

  const fail = (message: string): never => redirect(`/properties/${property_id}?error=${encodeURIComponent(message)}`);
  if (!contact_id) return fail("Busca a la persona por nombre, email o RUT.");

  const { error } = await supabase.from("property_candidates").insert({ property_id, contact_id });
  if (error) {
    if (error.code === "23505") return fail("Esa persona ya es candidata a esta propiedad.");
    if (error.message.includes("already has an active contract")) {
      return fail("Esta propiedad ya tiene un contrato en curso — no admite candidatos nuevos.");
    }
    return fail(error.message);
  }

  revalidatePath(`/properties/${property_id}`);
  redirect(`/properties/${property_id}`);
}

export async function markCandidateNotSelected(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const property_id = String(formData.get("property_id"));

  const { error } = await supabase.from("property_candidates").update({ status: "no_seleccionado" }).eq("id", id);
  if (error) redirect(`/properties/${property_id}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/properties/${property_id}`);
  redirect(`/properties/${property_id}`);
}

export async function reactivateCandidate(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const property_id = String(formData.get("property_id"));

  const { error } = await supabase.from("property_candidates").update({ status: "en_evaluacion" }).eq("id", id);
  if (error) {
    const message = error.message.includes("already has an active contract")
      ? "Esta propiedad ya tiene un contrato en curso — no admite candidatos nuevos."
      : error.message;
    redirect(`/properties/${property_id}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/properties/${property_id}`);
  redirect(`/properties/${property_id}`);
}
