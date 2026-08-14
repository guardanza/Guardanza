"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { findUserIdByEmail } from "@/lib/supabase/find-user-by-email";

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

// "Ya tengo al arrendatario" (Paso 1 de la Opción C): atajo para cuando
// no hace falta competencia de candidatos — encadena tres piezas que ya
// existen y quedan sin tocar (load_contact, el insert de
// property_candidates, y el formulario /contracts/new de siempre) en vez
// de duplicar su lógica. Termina en el MISMO lugar donde termina agregar
// un candidato a mano y elegirlo como ganador — esto es solo un on-ramp
// más rápido a ese mismo camino, no un camino nuevo.
//
// Caso borde deliberadamente simple: si el email ya está cargado en la
// libreta (choque de unique(organization_id, email)), no se intenta
// reusar el contacto automáticamente — se avisa y la persona ya aparece
// en el buscador normal de candidatos de abajo. Menos superficie nueva
// en una zona sensible, a costa de un paso manual en un caso raro.
export async function quickAdjudicate(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const property_id = String(formData.get("property_id"));
  const email = String(formData.get("tenant_email") || "")
    .trim()
    .toLowerCase();

  const fail = (message: string): never => redirect(`/properties/${property_id}?error=${encodeURIComponent(message)}`);
  if (!email) return fail("Ingresa el email del arrendatario.");

  const target_user_id = await findUserIdByEmail(email);
  if (!target_user_id) {
    return fail(`No existe una cuenta con el email ${email}. El arrendatario debe registrarse primero.`);
  }

  const { data: property } = await supabase
    .from("properties")
    .select("organization_id, broker_organization_id")
    .eq("id", property_id)
    .single();
  if (!property) return fail("Esta propiedad ya no existe.");

  // Una cuenta administra como mucho una organización (Restricción B,
  // 20260731170001) — no hace falta decidir entre dueña o corredora,
  // alcanza con encontrar la única que administra el que llama, si es
  // alguna de las dos de esta propiedad.
  const { data: adminMembership } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", userRes.user.id)
    .eq("role", "admin")
    .maybeSingle();
  const organization_id = adminMembership?.organization_id;
  if (!organization_id || (organization_id !== property.organization_id && organization_id !== property.broker_organization_id)) {
    return fail("No tienes permiso para adjudicar en esta propiedad.");
  }

  // Nombre y RUT salen del propio perfil de la cuenta encontrada — así
  // el corredor no tiene que retipear datos que esa cuenta ya tiene.
  // Service-role porque profiles_select_self_or_shared no deja leer el
  // perfil de un tercero sin relación compartida todavía (que es
  // justo lo que se está por crear).
  const admin = createServiceRoleClient();
  const { data: targetProfile } = await admin.from("profiles").select("full_name, rut").eq("id", target_user_id).maybeSingle<{
    full_name: string;
    rut: string | null;
  }>();
  if (!targetProfile) return fail("No se pudo obtener el perfil de esa cuenta.");

  const { data: contact, error: contactError } = await supabase
    .rpc("load_contact", {
      p_organization_id: organization_id,
      p_contact_role: "arrendatario",
      p_full_name: targetProfile.full_name,
      p_email: email,
      p_rut: targetProfile.rut,
      p_target_user_id: target_user_id,
    })
    .single<{ id: string }>();

  if (contactError) {
    if (contactError.code === "23505") {
      return fail("Ya tienes un contacto cargado con ese email — búscalo abajo, entre los candidatos, para adjudicarlo.");
    }
    if (contactError.message.includes("platform admin")) {
      return fail("Esa cuenta es de un administrador de plataforma — no puede ser arrendatario.");
    }
    if (contactError.message.includes("contact_role_mismatch")) {
      return fail("Ese email ya pertenece a una cuenta de Guardanza con otro rol — no puede ser arrendatario(a).");
    }
    return fail(contactError.message);
  }

  const { data: candidate, error: candidateError } = await supabase
    .from("property_candidates")
    .insert({ property_id, contact_id: contact.id })
    .select("id")
    .single();

  if (candidateError) {
    if (candidateError.code === "23505") {
      return fail("Esa persona ya es candidata a esta propiedad — búscala abajo para adjudicarla.");
    }
    if (candidateError.message.includes("already has an active contract")) {
      return fail("Esta propiedad ya tiene un contrato en curso — no admite candidatos nuevos.");
    }
    return fail(candidateError.message);
  }

  redirect(`/contracts/new?property_id=${property_id}&candidate_id=${candidate.id}`);
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
