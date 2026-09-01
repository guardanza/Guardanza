import Link from "next/link";
import Image from "next/image";
import { AdjudicateCandidateSheet, DiscardCandidateSheet } from "@/components/candidate-decision-sheets";
import { Button } from "@/components/ui/button";
import { cleanDisplayName } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { CandidateDocumentProgress } from "@/lib/candidate-document-list";

// Rediseño visual (cambio de forma, no de lógica — la adjudicación real
// sigue siendo select_winning_candidate()/AdjudicateCandidateSheet tal
// cual estaban): los candidatos son el corazón de la decisión del
// corredor, así que la tarjeta pesa — verde oscuro de marca, no una
// fila más de una lista. Colores literales (no tokens del sistema, que
// invierten con el tema — --brand-forest está pensado para TEXTO, no
// para un fondo que tiene que quedarse oscuro siempre): esta tarjeta se
// ve igual en modo claro y oscuro de la app, a propósito, como una
// pieza de marca fija, no chrome que se adapta.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
    <div
      className={cn(
        "rounded-2xl border p-3.5 text-white shadow-[0_3px_12px_rgba(20,67,47,0.22)]",
        isDone
          ? "border-[#2f8258] bg-gradient-to-br from-[#1b5c3e] to-[#14432f] shadow-[0_4px_18px_rgba(31,122,77,0.34)]"
          : "border-[#0e3123] bg-[#14432f]"
      )}
    >
      <div className="mb-3 flex items-center gap-3">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={52}
            height={52}
            className="size-[52px] shrink-0 rounded-full border-2 border-white/22 object-cover"
          />
        ) : (
          <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full border-2 border-white/22 bg-[#3d8563] text-lg font-bold text-white">
            {initials(name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-white">{name}</p>
          <p className="truncate text-[11px] text-[#9dc4b1]">{email}</p>
        </div>
        <span className="shrink-0 self-start rounded-full bg-white/15 px-2.5 py-1 text-[9.5px] font-semibold whitespace-nowrap text-[#d6ece1]">
          {stateChip}
        </span>
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
          <Button type="submit" variant="outline" size="sm" className="w-full border-white/38 bg-transparent text-white hover:bg-white/10">
            Reactivar
          </Button>
        </form>
      ) : null}
    </div>
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
        <p className="text-xs text-[#c3ddd0]">Invitación pendiente — todavía no confirma su cuenta.</p>
        <DiscardCandidateSheet
          action={discardAction}
          candidateId={propertyCandidateId}
          propertyId={propertyId}
          fullName={fullName}
          triggerVariant="icon"
          triggerClassName="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-[#ff8c82]/45 text-[#ff9a92] hover:bg-white/5"
        />
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
          <Button type="submit" variant="outline" size="sm" className="w-full border-white/38 bg-transparent text-white hover:bg-white/10">
            {evaluationStatus === "invitado" ? "Reenviar evaluación" : "Enviar evaluación de papeles"}
          </Button>
        </form>
        <DiscardCandidateSheet
          action={discardAction}
          candidateId={propertyCandidateId}
          propertyId={propertyId}
          fullName={fullName}
          triggerVariant="icon"
          triggerClassName="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-[#ff8c82]/45 text-[#ff9a92] hover:bg-white/5"
        />
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
        <p className="text-xs text-[#c3ddd0]">Evaluación en curso.</p>
        <DiscardCandidateSheet
          action={discardAction}
          candidateId={propertyCandidateId}
          propertyId={propertyId}
          fullName={fullName}
          triggerVariant="icon"
          triggerClassName="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-[#ff8c82]/45 text-[#ff9a92] hover:bg-white/5"
        />
      </div>
    );
  }

  const percent = progress.total > 0 ? Math.round((progress.uploaded / progress.total) * 100) : 0;

  return (
    <>
      <div className="mb-3">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[11px] font-semibold text-[#c3ddd0]">{isDone ? "Documentos completos" : "Progreso documental"}</span>
          <span className="text-[11px] font-bold text-[#86e0b3] tabular-nums">
            {progress.uploaded} de {progress.total}
          </span>
        </div>
        <div className="h-[7px] overflow-hidden rounded-full bg-white/16">
          <div className="h-full rounded-full bg-[#4ec98c]" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={detailHref}
          className="flex-1 rounded-[10px] border-[1.5px] border-white/38 px-2.5 py-2.5 text-center text-[12.5px] font-bold text-white hover:bg-white/10"
        >
          Revisar detalle
        </Link>
        <AdjudicateCandidateSheet
          href={`/contracts/new?property_id=${propertyId}&candidate_id=${propertyCandidateId}`}
          fullName={fullName}
          hasLandlord={hasLandlord}
          propertyId={propertyId}
          disabled={!isDone}
          triggerClassName={cn(
            "flex-1 rounded-[10px] px-2.5 py-2.5 text-[12.5px] font-bold h-auto",
            isDone ? "bg-white text-[#14432f] hover:bg-white/90" : "bg-white/13 text-white/42 hover:bg-white/13"
          )}
        />
        <DiscardCandidateSheet
          action={discardAction}
          candidateId={propertyCandidateId}
          propertyId={propertyId}
          fullName={fullName}
          triggerVariant="icon"
          triggerClassName="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-[#ff8c82]/45 text-[#ff9a92] hover:bg-white/5"
        />
      </div>
    </>
  );
}

