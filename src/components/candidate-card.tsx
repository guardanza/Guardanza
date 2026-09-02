import Link from "next/link";
import Image from "next/image";
import { AdjudicateCandidateSheet, DiscardCandidateSheet } from "@/components/candidate-decision-sheets";
import { Button } from "@/components/ui/button";
import { GreenCard, GreenChip } from "@/components/ui/green-card";
import { cleanDisplayName } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { CandidateDocumentProgress } from "@/lib/candidate-document-list";

// Verde de marca unificado en toda la app (--brand-green-card, "75%" —
// ver /estilos y ui/green-card.tsx, el primitivo del que sale esta
// tarjeta) — texto claro sobre fondo medio, con la paleta de contraste
// verificada de verdad (no asumida): blanco puro es el techo matemático
// de contraste sobre #3f8f66 (3.94:1) — NINGÚN verde-menta más tenue
// llega más alto, así que acá no se usa ningún tono "atenuado" para
// texto secundario (el propio mockup de referencia original sí lo
// hacía, y por eso el email quedaba en 3.16:1). La jerarquía
// nombre/email se resuelve con tamaño y peso, no con un color más
// apagado — apagar el color solo empeora el contraste en este fondo.
//
// El nombre va en text-sm (13px) bold — un nivel por debajo del título
// de sección (SectionTitle, text-lg/18px, ver ui/section-title.tsx:
// "Candidatos para arrendar" en la ficha de propiedad) y uno por
// encima del email (text-xs/12px, regular). Antes el nombre estaba en
// text-lg (18px), más grande que el título de la sección que lo
// contenía — jerarquía invertida. A este tamaño ya no califica como
// "texto grande" de WCAG (necesita bold ≥18px), así que el nombre
// queda en el mismo 3.94:1 que el email — corto de la AA estricta
// (4.5:1) para texto chico, mismo techo ya aceptado para el email,
// ahora también acá: es el máximo posible sin cambiar el verde de
// fondo, y el peso bold lo sigue distinguiendo del email.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Texto claro con una sombra sutil detrás — no cambia el contraste que
// mide WCAG (eso solo compara color contra color sólido), pero sí ayuda
// a la legibilidad real sobre un verde con textura/gradiente, sobre
// todo para quien no ve tan nítido. Barato de dar, nunca de más.
const legibleText = "[text-shadow:0_1px_2px_rgba(0,0,0,0.18)]";

export function CandidateCard({
  propertyCandidateId,
  propertyId,
  status,
  fullName,
  email,
  avatarUrl,
  contactStatus,
  evaluationStatus,
  progress,
  hasLandlord,
  detailHref,
  sendEvaluationAction,
  discardAction,
  reactivateAction,
}: {
  propertyCandidateId: string;
  propertyId: string;
  status: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  contactStatus: string;
  evaluationStatus: string | null;
  progress: CandidateDocumentProgress | null;
  hasLandlord: boolean;
  detailHref: string;
  sendEvaluationAction: (formData: FormData) => void;
  discardAction: (formData: FormData) => void;
  reactivateAction: (formData: FormData) => void;
}) {
  const name = cleanDisplayName(fullName);
  const isDone = progress !== null && progress.uploaded === progress.total;
  const stateChip = status === "seleccionado" ? "Adjudicado" : status === "no_seleccionado" ? "No seleccionado" : "En evaluación";

  return (
    <GreenCard deep={isDone} className={cn("p-3", isDone ? "shadow-[0_4px_18px_rgba(20,67,47,0.4)]" : "shadow-[0_3px_12px_rgba(20,67,47,0.22)]")}>
      <div className="mb-2.5 flex items-center gap-3">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={44}
            height={44}
            className="size-11 shrink-0 rounded-full border-2 border-white/25 object-cover"
          />
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-white/25 bg-brand-green-card-deep text-sm font-bold text-white">
            {initials(name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-bold text-white", legibleText)}>{name}</p>
          <p className={cn("truncate text-xs text-white", legibleText)}>{email}</p>
        </div>
        <GreenChip tone="solid" className="shrink-0 self-start px-2.5 py-1 text-[9.5px]">
          {stateChip}
        </GreenChip>
      </div>

      {status === "en_evaluacion" ? (
        <CandidateCardBody
          propertyCandidateId={propertyCandidateId}
          propertyId={propertyId}
          fullName={name}
          contactStatus={contactStatus}
          evaluationStatus={evaluationStatus}
          progress={progress}
          isDone={isDone}
          hasLandlord={hasLandlord}
          detailHref={detailHref}
          sendEvaluationAction={sendEvaluationAction}
          discardAction={discardAction}
        />
      ) : status === "no_seleccionado" ? (
        <form action={reactivateAction}>
          <input type="hidden" name="id" value={propertyCandidateId} />
          <input type="hidden" name="property_id" value={propertyId} />
          <Button type="submit" variant="outline" size="sm" className="w-full border-white/65 bg-transparent font-bold text-white hover:bg-white/12">
            Reactivar
          </Button>
        </form>
      ) : null}
    </GreenCard>
  );
}

function CandidateCardBody({
  propertyCandidateId,
  propertyId,
  fullName,
  contactStatus,
  evaluationStatus,
  progress,
  isDone,
  hasLandlord,
  detailHref,
  sendEvaluationAction,
  discardAction,
}: {
  propertyCandidateId: string;
  propertyId: string;
  fullName: string;
  contactStatus: string;
  evaluationStatus: string | null;
  progress: CandidateDocumentProgress | null;
  isDone: boolean;
  hasLandlord: boolean;
  detailHref: string;
  sendEvaluationAction: (formData: FormData) => void;
  discardAction: (formData: FormData) => void;
}) {
  // Todavía no confirmó su cuenta — no hay nada de evaluación que
  // mostrar todavía, solo la opción de descartarla como candidata.
  if (contactStatus !== "confirmado") {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-white">Invitación pendiente — todavía no confirma su cuenta.</p>
        <DiscardTrigger discardAction={discardAction} propertyCandidateId={propertyCandidateId} propertyId={propertyId} fullName={fullName} />
      </div>
    );
  }

  // Confirmó la cuenta pero todavía no hay nada que mostrar de la
  // evaluación de papeles — sin barra vacía sin contexto: un botón para
  // enviar (o reenviar) el link, más descartar.
  if (!evaluationStatus || evaluationStatus === "invitado") {
    return (
      <div className="flex items-center gap-2">
        <form action={sendEvaluationAction} className="flex-1">
          <input type="hidden" name="property_candidate_id" value={propertyCandidateId} />
          <input type="hidden" name="property_id" value={propertyId} />
          <Button type="submit" variant="outline" size="sm" className="w-full border-white/65 bg-transparent font-bold text-white hover:bg-white/12">
            {evaluationStatus === "invitado" ? "Reenviar evaluación" : "Enviar evaluación de papeles"}
          </Button>
        </form>
        <DiscardTrigger discardAction={discardAction} propertyCandidateId={propertyCandidateId} propertyId={propertyId} fullName={fullName} />
      </div>
    );
  }

  // En curso, ya confirmada — pero todavía no llegó al paso de tipo de
  // ingreso (progress null: sin income_type no hay matriz que calcular
  // todavía, ver resolveCandidateProgress). Mismo criterio: nada de
  // barra vacía, un texto de estado nomás.
  if (!progress) {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-white">Evaluación en curso.</p>
        <DiscardTrigger discardAction={discardAction} propertyCandidateId={propertyCandidateId} propertyId={propertyId} fullName={fullName} />
      </div>
    );
  }

  const percent = progress.total > 0 ? Math.round((progress.uploaded / progress.total) * 100) : 0;

  return (
    <>
      <div className="mb-3">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[11px] text-white">{isDone ? "Documentos completos" : "Progreso documental"}</span>
          <span className="text-[11px] font-bold text-white tabular-nums">
            {progress.uploaded} de {progress.total}
          </span>
        </div>
        {/* Pista oscura (negro/20%, no blanco translúcido) — sobre este
            verde medio, un relleno claro apenas se distinguía de una
            pista clara (1.46:1, casi invisible). Relleno blanco sobre
            pista oscura: 5.73:1, se lee sin esfuerzo. */}
        <div className="h-[7px] overflow-hidden rounded-full bg-black/20">
          <div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={detailHref}
          className="flex-1 rounded-[10px] border-[1.5px] border-white/65 px-2.5 py-2.5 text-center text-[12.5px] font-bold text-white hover:bg-white/12"
        >
          Ver
        </Link>
        <AdjudicateCandidateSheet
          href={`/contracts/new?property_id=${propertyId}&candidate_id=${propertyCandidateId}`}
          fullName={fullName}
          hasLandlord={hasLandlord}
          propertyId={propertyId}
          disabled={!isDone}
          triggerClassName={cn(
            "flex-1 rounded-[10px] px-2.5 py-2.5 text-[12.5px] font-bold h-auto",
            // Deshabilitado: WCAG exime a los controles inactivos del
            // contraste mínimo (no son interactivos), pero igual queda
            // perceptible como botón apagado, no invisible.
            isDone ? "bg-white text-brand-green-card-deep-border hover:bg-white/90" : "bg-white/22 text-white/70 hover:bg-white/22"
          )}
        />
        <DiscardTrigger discardAction={discardAction} propertyCandidateId={propertyCandidateId} propertyId={propertyId} fullName={fullName} />
      </div>
    </>
  );
}

function DiscardTrigger({
  discardAction,
  propertyCandidateId,
  propertyId,
  fullName,
}: {
  discardAction: (formData: FormData) => void;
  propertyCandidateId: string;
  propertyId: string;
  fullName: string;
}) {
  return (
    <DiscardCandidateSheet
      action={discardAction}
      candidateId={propertyCandidateId}
      propertyId={propertyId}
      fullName={fullName}
      triggerVariant="icon"
      // Rojo suave, no el rojo funcional pleno (#ffd6d1) — sobre este
      // verde no hay ningún tono de rojo que llegue a AA sin perder por
      // completo el matiz "peligro"; este es el más alto posible
      // manteniéndolo reconocible como rojo, y el ícono de tacho ya
      // comunica la acción por forma, no solo por color.
      triggerClassName="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-white/50 text-[#ffd6d1] hover:bg-white/10"
    />
  );
}
