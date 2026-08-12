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

// Paso 5 (SENSIBLE): la conversión candidato→arrendatario + creación del
// contrato, en un solo acto — antes de esto solo hay candidatos
// compitiendo, sin ningún contrato. select_winning_candidate() (SECURITY
// DEFINER) hace todo el trabajo pesado: valida que el candidato siga
// en_evaluacion y que su contacto ya esté confirmado, crea el contrato,
// arma contract_parties (arrendador = el dueño de la propiedad, nunca
// quien llama — puede ser el corredor), y marca al resto de los
// candidatos en_evaluacion de la misma propiedad como no_seleccionado.
// Autoriza tanto al arrendador como al corredor delegado — una
// autorización nueva, pero acotada a esta función: create_contract() (el
// camino viejo, con email libre) sigue siendo estrictamente del
// arrendador, sin cambios.
export async function selectWinningCandidate(formData: FormData) {
  const supabase = await createClient();
  const property_id = String(formData.get("property_id"));
  const candidate_id = String(formData.get("candidate_id") || "");
  const start_date = String(formData.get("start_date"));
  const end_date = String(formData.get("end_date"));
  const rent_amount = Number(formData.get("rent_amount"));
  const rent_currency = String(formData.get("rent_currency"));
  const guarantee_currency = String(formData.get("guarantee_currency"));
  const guarantee_amount = Number(formData.get("guarantee_amount"));

  const fail = (message: string): never =>
    redirect(`/contracts/new?property_id=${property_id}&candidate_id=${candidate_id}&error=${encodeURIComponent(message)}`);

  const { data: contract, error } = await supabase
    .rpc("select_winning_candidate", {
      p_candidate_id: candidate_id,
      p_start_date: start_date,
      p_end_date: end_date,
      p_rent_amount: rent_amount,
      p_rent_currency: rent_currency,
      p_guarantee_currency: guarantee_currency,
      p_guarantee_amount: guarantee_amount,
    })
    .single<{ id: string }>();

  if (error) {
    if (error.message.includes("not en_evaluacion")) {
      return fail("Este candidato ya no está en evaluación — puede que la propiedad ya tenga un ganador.");
    }
    if (error.message.includes("has not confirmed")) {
      return fail("Este candidato todavía no confirmó su cuenta — no puede ser el arrendatario todavía.");
    }
    if (error.message.includes("not authorized")) {
      return fail("No tienes permiso para elegir un ganador en esta propiedad.");
    }
    return fail(error.message);
  }

  revalidatePath(`/properties/${property_id}`);
  redirect(`/contracts/${contract.id}`);
}

// Paso 6 (SENSIBLE): deshacer una adjudicación por completo, como si
// nunca hubiera pasado — solo mientras nadie firmó todavía.
// undo_winning_candidate() (SECURITY DEFINER) valida eso, borra el
// contrato y su garantía, y devuelve al candidato ganador (y a los que
// esa misma adjudicación había descartado) a en_evaluacion. Vive en
// /contracts/[id] junto a "Cancelar contrato" — a diferencia de esa
// acción (que deja el contrato como registro histórico 'cancelado'),
// esto lo borra: pensado para "me equivoqué de candidato", no para
// dejar un rastro de que hubo un intento.
export async function undoWinningCandidate(formData: FormData) {
  const supabase = await createClient();
  const contract_id = String(formData.get("contract_id"));
  const property_id = String(formData.get("property_id"));

  const { error } = await supabase.rpc("undo_winning_candidate", { p_contract_id: contract_id });
  if (error) {
    if (error.message.includes("already has a signature")) {
      redirect(`/contracts/${contract_id}?error=${encodeURIComponent("Ya hay al menos una firma — no se puede deshacer, solo cancelar.")}`);
    }
    if (error.message.includes("not authorized")) {
      redirect(`/contracts/${contract_id}?error=${encodeURIComponent("No tienes permiso para deshacer esta adjudicación.")}`);
    }
    redirect(`/contracts/${contract_id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/properties/${property_id}`);
  redirect(`/properties/${property_id}`);
}
