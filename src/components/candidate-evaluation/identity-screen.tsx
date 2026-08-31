"use client";

import { useState } from "react";
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
  const [docType, setDocType] = useState<CandidateIdentityDocType | null>(initialIdentityDocType);
  // Cámara por default en mobile, archivo/arrastre por default en
  // desktop (spec sección 9) — pero siempre hay un link visible para
  // cambiar, en ambos sentidos; useCamera es lo único que ese link
  // toca, el resto del estado no se pierde.
  const [useCamera, setUseCamera] = useState(isMobile);
  const [error, setError] = useState<string | null>(null);
  // Encontrado en un Android real: tras subir la reverso, esto pasaba a
  // "listo" con router.refresh() — pero eso deja el estado del árbol de
  // componentes cliente bajo esta pantalla a merced de cómo React
  // reconcilie el nuevo payload del server component, y en la práctica
  // resultó impredecible (el componente de captura volvía a su estado
  // inicial vacío en vez de dar paso a la pantalla de ingreso). Una
  // navegación real y completa a la URL limpia (sin ?paso=) es más
  // lenta mostrar pero 100% predecible: la página vuelve a derivar todo
  // desde cero en el servidor, sin ninguna ambigüedad de qué estado de
  // cliente sobrevive.
  const [finishing, setFinishing] = useState(false);

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
      // Encontrado en un Android real: sin este tope, una subida
      // colgada (red móvil inestable) dejaba la pantalla en "Subiendo…"
      // para siempre, sin ningún error — nada que informarle a la
      // persona ni ninguna forma de reintentar. No cancela la subida
      // original (los server actions no lo permiten hoy), pero libera
      // la pantalla y deja repetir si de verdad no llegó a nada.
      await Promise.race([
        uploadCandidateIdentityPhoto(formData),
        new Promise((_, reject) => setTimeout(() => reject(new Error("La subida está tomando demasiado — revisa tu conexión e intenta de nuevo.")), 30_000)),
      ]);
      if (docType === "cedula_chilena" && documentType === "cedula_identidad") {
        setStep("reverso");
      } else {
        // Terminó la identidad — navegación real (no router.refresh())
        // a la misma página sin ?paso=, para que el server component la
        // vuelva a derivar de cero con datos ya al día (ver el
        // comentario junto a "finishing" más arriba).
        setFinishing(true);
        window.location.href = `/evaluacion/postulacion/${candidateParticipantId}`;
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

  // La foto ya se subió y quedó guardada — lo único que falta es que
  // termine de cargar la página siguiente (ver setFinishing más
  // arriba). Reemplaza al componente de captura (que ya terminó su
  // propio "Subiendo…") para que la persona vea que sí avanzó, en vez
  // de quedar mirando algo que parece pegado.
  if (finishing) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">Identidad guardada — cargando el siguiente paso…</p>
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
