import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { one } from "@/lib/supabase/one";
import type { CandidateParticipantType } from "@/lib/candidate-participant-messaging";

export interface PendingCandidateEvaluation {
  id: string;
  propertyAddress: string;
  participantType: CandidateParticipantType;
}

// Evaluaciones de papeles que la propia persona tiene invitadas y en
// curso, sin terminar — alimenta tanto la campanita del header como la
// sección "Evaluaciones" del dashboard, mismo criterio en los dos
// lugares para que nunca se desincronicen. Solo status = 'en_progreso'
// a propósito: 'invitado' (recién invitado, sin confirmar la cuenta
// todavía) no cuenta como "en curso" acá, ni 'completado' (ya
// terminada). Nunca las del corredor sobre otras personas — eso ya
// tiene su propia visibilidad en la ficha de la propiedad, esto es
// solo lo que la propia persona tiene pendiente.
interface PendingRow {
  id: string;
  participant_type: CandidateParticipantType;
  property_candidates: { properties: { address: string } | { address: string }[] | null } | { properties: { address: string } | { address: string }[] | null }[] | null;
}

export async function getPendingCandidateEvaluations(supabase: SupabaseClient, userId: string): Promise<PendingCandidateEvaluation[]> {
  const { data } = await supabase
    .from("candidate_participants")
    .select("id, participant_type, property_candidates(properties(address))")
    .eq("user_id", userId)
    .eq("status", "en_progreso")
    .returns<PendingRow[]>();

  return (data ?? []).map((row) => ({
    id: row.id,
    participantType: row.participant_type,
    propertyAddress: one(one(row.property_candidates)?.properties)?.address ?? "Propiedad",
  }));
}
