"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/actions/auth";
import { emailProvider } from "@/lib/adapters/email";
import type { CandidateParticipantType } from "@/lib/candidate-participant-messaging";

type IssueOutcome = { ok: true } | { ok: false; message: string };

// Emite (o reemite, si ya había una invitación pendiente) el link de
// evaluación de papeles para un participante ya creado, y manda el
// correo con el tono correcto — reusa resolve_candidate_participant_invite
// (el mismo RPC anon-safe que usa la pantalla de aterrizaje) para no
// armar una consulta aparte con los mismos datos.
//
// A diferencia de issueInviteOrLink (contacts), acá NUNCA hay un camino
// de "linked: true" — no existe el vínculo automático, ver el
// comentario de la migración 20260831100001. Esta función solo emite
// e informa; el resto del ciclo (resolver, confirmar) vive en
// candidate-participant-invites.ts, del lado de quien acepta.
export async function issueCandidateParticipantInvite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  candidateParticipantId: string
): Promise<IssueOutcome> {
  const { data: invite, error } = await supabase
    .rpc("issue_candidate_participant_invite", { p_candidate_participant_id: candidateParticipantId })
    .single<{ raw_token: string; expires_at: string }>();

  if (error || !invite) {
    console.error(`[candidate-participants] no se pudo emitir la invitación para ${candidateParticipantId}: ${error?.message}`);
    return { ok: false, message: error?.message ?? "No se pudo procesar la invitación." };
  }

  const { data: details } = await supabase
    .rpc("resolve_candidate_participant_invite", { p_token: invite.raw_token })
    .maybeSingle<{
      participant_type: CandidateParticipantType;
      full_name: string;
      email: string;
      property_address: string;
      inviter_name: string;
    }>();
  if (!details) {
    console.error(`[candidate-participants] no se pudo resolver el token recién emitido para ${candidateParticipantId}`);
    return { ok: false, message: "No se pudo preparar la invitación." };
  }

  const origin = await siteOrigin();
  const acceptUrl = `${origin}/evaluacion/${invite.raw_token}`;

  try {
    await emailProvider.sendCandidateParticipantInvite({
      to: details.email,
      participantFullName: details.full_name,
      participantType: details.participant_type,
      propertyAddress: details.property_address,
      inviterName: details.inviter_name,
      acceptUrl,
      expiresAt: new Date(invite.expires_at),
    });
  } catch (e) {
    console.error(`[candidate-participants] no se pudo enviar el email de invitación para ${candidateParticipantId}:`, e);
  }
  return { ok: true };
}

// Único punto de entrada de UI en esta etapa: el corredor/arrendador
// inicia la evaluación de papeles del TITULAR de una candidatura, desde
// la lista de candidatos de la propiedad. Codeudor/coarrendatario
// comparten el mismo mecanismo por debajo, pero todavía no tienen botón
// propio — no hay pantalla donde tenga sentido de producto dispararlos
// hasta el flujo guiado (Etapa 3) o la ficha de revisión del corredor
// (Etapa 7).
export async function startCandidateEvaluation(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const property_candidate_id = String(formData.get("property_candidate_id") || "");
  const property_id = String(formData.get("property_id") || "");

  const fail = (message: string): never => redirect(`/properties/${property_id}?error=${encodeURIComponent(message)}`);
  if (!property_candidate_id || !property_id) return fail("No se encontró esta candidatura.");

  // El titular ya existe como contacto (arrendatario) desde que se
  // agregó como candidato — se reusan esos datos, no se piden de nuevo.
  const { data: candidate, error: candidateError } = await supabase
    .from("property_candidates")
    .select("id, contacts(full_name, email)")
    .eq("id", property_candidate_id)
    .single<{ id: string; contacts: { full_name: string; email: string } | { full_name: string; email: string }[] | null }>();
  if (candidateError || !candidate) return fail("No se encontró esta candidatura.");
  const contact = Array.isArray(candidate.contacts) ? candidate.contacts[0] : candidate.contacts;
  if (!contact) return fail("No se encontró al candidato.");

  // Reenvío natural: si ya existe la fila titular y sigue 'invitado',
  // se reusa (issueCandidateParticipantInvite reemite un token nuevo)
  // en vez de duplicarla — el índice único parcial (a lo más un titular
  // por candidatura) lo impediría igual, esto solo evita el error.
  const { data: existing } = await supabase
    .from("candidate_participants")
    .select("id, status")
    .eq("property_candidate_id", property_candidate_id)
    .eq("participant_type", "titular")
    .maybeSingle<{ id: string; status: string }>();

  let candidateParticipantId: string;
  if (existing) {
    if (existing.status !== "invitado") {
      return fail("Esta persona ya empezó o terminó su evaluación de papeles.");
    }
    candidateParticipantId = existing.id;
  } else {
    const { data: created, error: createError } = await supabase
      .from("candidate_participants")
      .insert({
        property_candidate_id,
        participant_type: "titular",
        full_name: contact.full_name,
        email: contact.email,
        created_by: userRes.user.id,
      })
      .select("id")
      .single<{ id: string }>();
    if (createError) return fail(createError.message);
    candidateParticipantId = created.id;
  }

  const outcome = await issueCandidateParticipantInvite(supabase, candidateParticipantId);
  if (!outcome.ok) return fail(outcome.message);

  revalidatePath(`/properties/${property_id}`);
  redirect(`/properties/${property_id}?invited=${encodeURIComponent(contact.full_name)}`);
}
