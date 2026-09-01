"use client";

import { useState } from "react";
import { Check, FileWarning, ShieldCheck } from "lucide-react";
import { CandidateDocumentCapture } from "@/components/candidate-document-capture";
import { uploadCandidateDocument } from "@/lib/actions/candidate-evaluation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { CandidateDocumentRow } from "@/lib/candidate-document-list";
import type { CandidateDocumentType } from "@/lib/candidate-documents";

// Pantalla 4 del flujo guiado (Etapa 4) — a diferencia de identidad/
// ingreso, acá no hay "pasos" secuenciales: es una lista, cada fila
// sube por su cuenta, cualquier orden. Por eso NO usa router.refresh()
// ni navegación para reflejar una subida — el estado local (rows) ya
// sabe lo que acaba de pasar, sin depender de un viaje al servidor
// para saberlo (la lección de la Etapa 3: esos viajes son justo lo que
// se cuelga en una red móvil). El servidor sigue siendo la fuente de
// verdad en la próxima carga de la página — esto es solo optimista
// para esta sesión.
export function DocumentListScreen({
  candidateParticipantId,
  rows: initialRows,
}: {
  candidateParticipantId: string;
  rows: CandidateDocumentRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [expanded, setExpanded] = useState<CandidateDocumentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(documentType: CandidateDocumentType, blob: Blob, contentType: string) {
    setError(null);
    const formData = new FormData();
    formData.set("candidate_participant_id", candidateParticipantId);
    formData.set("document_type", documentType);
    formData.set("content_type", contentType);
    formData.set("file", blob, contentType === "application/pdf" ? "documento.pdf" : "documento.webp");
    try {
      await uploadCandidateDocument(formData);
      setRows((prev) => prev.map((r) => (r.documentType === documentType ? { ...r, uploaded: true } : r)));
      setExpanded(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el archivo.");
      throw e;
    }
  }

  const pending = rows.filter((r) => r.kind === "subir" && !r.uploaded);

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-center">
        <ShieldCheck className="mx-auto size-6 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-sm font-medium">Estos son los papeles que te corresponden</p>
        <p className="text-xs text-muted-foreground">
          {pending.length === 0
            ? "Ya subiste todo lo que te correspondía — tu corredor(a) revisa el resto."
            : "Puedes subirlos en cualquier orden. Tu corredor(a) revisa cada uno."}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ul className="divide-y rounded-xl border">
        {rows.map((row) => (
          <li key={row.documentType} className="px-4 py-3">
            {row.kind === "eximido" && (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm text-muted-foreground line-through">{row.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">Tu corredor(a) no exige esto</span>
              </div>
            )}

            {row.kind === "informe_comercial" && (
              <div className="flex items-center gap-2">
                <FileWarning className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <span className="flex-1 text-sm">{row.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">Lo obtenemos nosotros</span>
              </div>
            )}

            {row.kind === "subir" && row.uploaded && (
              <div className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-success" strokeWidth={2} />
                <span className="flex-1 text-sm">{row.label}</span>
                <span className="shrink-0 text-xs text-success">Subido</span>
              </div>
            )}

            {row.kind === "subir" && !row.uploaded && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => (prev === row.documentType ? null : row.documentType))}
                  className={cn(
                    "flex w-full items-center gap-2 text-left text-sm font-medium",
                    expanded === row.documentType ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className="flex-1">{row.label}</span>
                  <span className="shrink-0 text-xs underline underline-offset-4">
                    {expanded === row.documentType ? "Cerrar" : "Subir"}
                  </span>
                </button>
                {expanded === row.documentType && (
                  <CandidateDocumentCapture onAccept={(blob, contentType) => upload(row.documentType, blob, contentType)} />
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
