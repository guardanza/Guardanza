"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENT_TYPE_LABELS, type CandidateDocumentType, type CandidateIdentityDocType, type CandidateIncomeType } from "@/lib/candidate-documents";

function evaluationPath(candidateParticipantId: string): string {
  return `/evaluacion/postulacion/${candidateParticipantId}`;
}

// Pantalla 2 (identidad): sube UNA captura por llamada — la cámara (o
// el camino de archivo) invoca esto una vez por lado de la cédula, dos
// veces en total, o una sola vez para pasaporte. Subir incremental, no
// juntar las dos fotos y mandarlas al final: si la persona cierra la
// pestaña entre una foto y la otra, la primera ya quedó guardada — "todo
// estado se guarda" (spec sección 2) aplica también a mitad de una
// pantalla, no solo entre pantallas.
//
// identity_doc_type se graba en cada llamada (idempotente: la segunda
// llamada para la reverso de la cédula vuelve a grabar el mismo valor,
// sin costo) — así la pantalla no depende de en qué llamada exacta
// "toca" fijarlo.
export async function uploadCandidateIdentityPhoto(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const candidate_participant_id = String(formData.get("candidate_participant_id") || "");
  const identity_doc_type = String(formData.get("identity_doc_type") || "") as CandidateIdentityDocType;
  const document_type = String(formData.get("document_type") || "") as CandidateDocumentType;
  const file = formData.get("file");

  const fail = (message: string) => {
    throw new Error(message);
  };
  if (!candidate_participant_id) return fail("Falta la postulación.");
  if (identity_doc_type !== "cedula_chilena" && identity_doc_type !== "pasaporte_extranjero") return fail("Tipo de documento inválido.");
  if (!(file instanceof File) || file.size === 0) return fail("No se recibió ninguna foto.");

  const path = `${candidate_participant_id}/${document_type}-${crypto.randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage.from("candidate-documents").upload(path, file, { contentType: "image/webp" });
  if (uploadError) return fail(`No se pudo subir la foto: ${uploadError.message}`);

  const { error: docError } = await supabase
    .from("candidate_documents")
    .insert({ candidate_participant_id, document_type, storage_path: path });
  if (docError) return fail(docError.message);

  const { error: updateError } = await supabase
    .from("candidate_participants")
    .update({ identity_doc_type })
    .eq("id", candidate_participant_id);
  if (updateError) return fail(updateError.message);

  revalidatePath(evaluationPath(candidate_participant_id));
}

// Pantalla 4 (lista de documentos derivada): sube UN documento por
// llamada, igual que uploadCandidateIdentityPhoto — cada fila de la
// lista se sube por su cuenta, en cualquier orden, sin juntar nada. A
// diferencia de esa función, acá no hay ningún campo de identidad que
// actualizar (eso ya quedó resuelto en la pantalla anterior) y el
// content_type varía (imagen o PDF — ver candidate-document-capture.tsx),
// así que se recibe explícito en vez de asumir siempre webp.
export async function uploadCandidateDocument(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const candidate_participant_id = String(formData.get("candidate_participant_id") || "");
  const document_type = String(formData.get("document_type") || "") as CandidateDocumentType;
  const content_type = String(formData.get("content_type") || "");
  const file = formData.get("file");

  const fail = (message: string) => {
    throw new Error(message);
  };
  if (!candidate_participant_id) return fail("Falta la postulación.");
  if (!(document_type in DOCUMENT_TYPE_LABELS)) return fail("Tipo de documento inválido.");
  if (content_type !== "application/pdf" && content_type !== "image/webp") return fail("Tipo de archivo inválido.");
  if (!(file instanceof File) || file.size === 0) return fail("No se recibió ningún archivo.");

  const ext = content_type === "application/pdf" ? "pdf" : "webp";
  const path = `${candidate_participant_id}/${document_type}-${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("candidate-documents").upload(path, file, { contentType: content_type });
  if (uploadError) return fail(`No se pudo subir el archivo: ${uploadError.message}`);

  const { error: docError } = await supabase
    .from("candidate_documents")
    .insert({ candidate_participant_id, document_type, storage_path: path });
  if (docError) return fail(docError.message);

  revalidatePath(evaluationPath(candidate_participant_id));
}

// Pantalla 3 (tipo de ingreso): un simple UPDATE, sin subida de
// archivo — se pregunta antes de mostrar cualquier lista de documentos
// (spec sección 5: "nunca lista genérica"), esa lista es la Etapa 4.
export async function saveCandidateIncomeType(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const candidate_participant_id = String(formData.get("candidate_participant_id") || "");
  const income_type = String(formData.get("income_type") || "") as CandidateIncomeType;

  const fail = (message: string): never =>
    redirect(`${evaluationPath(candidate_participant_id)}?error=${encodeURIComponent(message)}`);
  if (!["dependiente", "independiente", "pensionado"].includes(income_type)) return fail("Elige un tipo de ingreso.");

  const { error } = await supabase.from("candidate_participants").update({ income_type }).eq("id", candidate_participant_id);
  if (error) return fail(error.message);

  revalidatePath(evaluationPath(candidate_participant_id));
  redirect(evaluationPath(candidate_participant_id));
}
