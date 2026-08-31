"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IdCard, BookUser } from "lucide-react";
import { uploadCandidateIdentityPhoto } from "@/lib/actions/candidate-evaluation";
import { IdentityCameraCapture } from "@/components/identity-camera-capture";
import { IdentityFileCapture } from "@/components/identity-file-capture";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { CandidateIdentityDocType } from "@/lib/candidate-documents";

type Step = "elegir" | "frontal" | "reverso";

// Pantalla 2 del flujo guiado (spec sección 5) — "va primero porque
// define la lista posterior y si hay informe comercial" (esta pantalla
// solo captura, la derivación de la lista es Etapa 4).
//
// hasFrontal/hasReverso vienen del server component (qué documentos ya
// existen para esta postulación) — retomar a mitad de la cédula (ya
// subió la frontal, cerró la pestaña antes de la reverso) tiene que
// caer directo en "reverso", no repetir la elección de tipo de
// documento ni pedir la frontal de nuevo.
export function IdentityScreen({
  candidateParticipantId,
  isMobile,
  initialIdentityDocType,
  hasFrontal,
  hasReverso,
}: {
  candidateParticipantId: string;
  isMobile: boolean;
  initialIdentityDocType: CandidateIdentityDocType | null;
  hasFrontal: boolean;
  hasReverso: boolean;
}) {
  const router = useRouter();
  const [docType, setDocType] = useState<CandidateIdentityDocType | null>(initialIdentityDocType);
  // Cámara por default en mobile, archivo/arrastre por default en
  // desktop (spec sección 9) — pero siempre hay un link visible para
  // cambiar, en ambos sentidos; useCamera es lo único que ese link
  // toca, el resto del estado no se pierde.
  const [useCamera, setUseCamera] = useState(isMobile);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>(() => {
    if (!initialIdentityDocType) return "elegir";
    if (initialIdentityDocType === "cedula_chilena" && !hasFrontal) return "frontal";
    if (initialIdentityDocType === "cedula_chilena" && !hasReverso) return "reverso";
    return "frontal";
  });

  async function upload(blob: Blob, documentType: "cedula_identidad" | "cedula_identidad_reverso" | "pasaporte") {
    if (!docType) return;
    setError(null);
    const formData = new FormData();
    formData.set("candidate_participant_id", candidateParticipantId);
    formData.set("identity_doc_type", docType);
    formData.set("document_type", documentType);
    formData.set("file", blob, "identidad.webp");
    try {
      await uploadCandidateIdentityPhoto(formData);
      if (docType === "cedula_chilena" && documentType === "cedula_identidad") {
        setStep("reverso");
      } else {
        // Terminó la identidad — router.refresh() re-corre el server
        // component, que deriva sola la siguiente pantalla (tipo de
        // ingreso). Sin esto habría que duplicar acá la misma lógica
        // de derivación que ya vive en la página.
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto.");
      throw e;
    }
  }

  if (step === "elegir") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Elige el documento con el que te vas a identificar.</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setDocType("cedula_chilena");
              setStep("frontal");
            }}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors",
              "hover:border-primary/50"
            )}
          >
            <IdCard className="size-6 text-muted-foreground" strokeWidth={1.5} />
            Cédula chilena
          </button>
          <button
            type="button"
            onClick={() => {
              setDocType("pasaporte_extranjero");
              setStep("frontal");
            }}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors",
              "hover:border-primary/50"
            )}
          >
            <BookUser className="size-6 text-muted-foreground" strokeWidth={1.5} />
            Pasaporte
          </button>
        </div>
      </div>
    );
  }

  const documentType = step === "reverso" ? "cedula_identidad_reverso" : docType === "pasaporte_extranjero" ? "pasaporte" : "cedula_identidad";
  const instruction =
    step === "reverso"
      ? "Ahora el reverso — apoya la cédula sobre una superficie plana y evita reflejos."
      : docType === "pasaporte_extranjero"
        ? "Encuadra la página con tu foto — apoya el pasaporte sobre una superficie plana y evita reflejos."
        : "Encuadra la cédula por su lado frontal — apoya sobre una superficie plana y evita reflejos.";

  return (
    <div className="space-y-3">
      {docType === "cedula_chilena" && (
        <p className="text-center text-xs font-medium text-muted-foreground">{step === "reverso" ? "Paso 2 de 2 — reverso" : "Paso 1 de 2 — frontal"}</p>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {/* key={step}: sin esto, React reusa la MISMA instancia al pasar de
          frontal a reverso (misma posición en el árbol) — su estado
          interno (ej. "Subiendo…" de la captura anterior) quedaba
          pegado en vez de partir limpio para la siguiente foto. */}
      {useCamera ? (
        <IdentityCameraCapture
          key={step}
          instruction={instruction}
          onAccept={(blob) => upload(blob, documentType)}
          onSwitchToFile={() => setUseCamera(false)}
        />
      ) : (
        <IdentityFileCapture
          key={step}
          onAccept={(blob) => upload(blob, documentType)}
          onSwitchToCamera={isMobile ? () => setUseCamera(true) : undefined}
          showCameraOption={isMobile}
        />
      )}
    </div>
  );
}
