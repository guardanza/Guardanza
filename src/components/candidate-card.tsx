import Link from "next/link";
import Image from "next/image";
import { AdjudicateCandidateSheet, DiscardCandidateSheet } from "@/components/candidate-decision-sheets";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandChip } from "@/components/ui/carbon-card";
import { cleanDisplayName } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { CandidateDocumentProgress } from "@/lib/candidate-document-list";

// Tarjeta blanca (sistema carbón + dorado — ver /estilos). El sistema
// verde anterior (--brand-green-card) se retiró: candidato y contacto
// vuelven a blanco, como pide la imagen de referencia. "Documentos
// completos" se distingue con un borde y un lavado dorados sutiles, no
// con un fondo de color aparte — el resto de la tarjeta sigue blanca.
//
// El nombre va en text-sm (13px) bold — un nivel por debajo del título
// de sección (SectionTitle, text-lg/18px) y uno por encima del email
// (text-xs/12px, regular) — misma jerarquía documentada en /estilos.
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

  return (
    <Card className={cn("p-3", isDone && "border-brand-gold/40 bg-brand-gold/5")}>
      <div className="mb-2.5 flex items-center gap-3">
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" width={44} height={44} className="size-11 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
            {initials(name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <StateChip status={status} />
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
          <Button type="submit" variant="outline" size="sm" className="w-full">
            Reactivar
          </Button>
        </form>
      ) : null}
    </Card>
  );
}

// "En evaluación" en dorado sobre beige (BrandChip, ver ui/carbon-card.tsx)
// — el único estado que es "marca", no significado. "Adjudicado" es un
// hecho positivo real: usa el verde funcional de éxito, no dorado.
// "No seleccionado" es neutro, gris — nunca rojo (no es un error).
function StateChip({ status }: { status: string }) {
  if (status === "seleccionado") {
    return (
      <span className="shrink-0 self-start rounded-full bg-success/15 px-2.5 py-1 text-[9.5px] font-bold whitespace-nowrap text-success">
        Adjudicado
      </span>
    );
  }
  if (status === "no_seleccionado") {
    return (
      <span className="shrink-0 self-start rounded-full bg-muted px-2.5 py-1 text-[9.5px] font-bold whitespace-nowrap text-muted-foreground">
        No seleccionado
      </span>
    );
  }
  return <BrandChip className="shrink-0 self-start px-2.5 py-1 text-[9.5px]">En evaluación</BrandChip>;
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
        <p className="text-xs text-muted-foreground">Invitación pendiente — todavía no confirma su cuenta.</p>
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
          <Button type="submit" variant="outline" size="sm" className="w-full">
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
        <p className="text-xs text-muted-foreground">Evaluación en curso.</p>
        <DiscardTrigger discardAction={discardAction} propertyCandidateId={propertyCandidateId} propertyId={propertyId} fullName={fullName} />
      </div>
    );
  }

  const percent = progress.total > 0 ? Math.round((progress.uploaded / progress.total) * 100) : 0;

  return (
    <>
      <div className="mb-3">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[11px] text-muted-foreground">{isDone ? "Documentos completos" : "Progreso documental"}</span>
          <span className="text-[11px] font-bold text-foreground tabular-nums">
            {progress.uploaded} de {progress.total}
          </span>
        </div>
        {/* Barra de progreso en degradado dorado, tal como pide la
            imagen de referencia. */}
        <div className="h-[7px] overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-gold-dark to-brand-gold-light"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={detailHref}
          className="flex-1 rounded-[10px] bg-primary px-2.5 py-2.5 text-center text-[12.5px] font-bold text-primary-foreground hover:bg-primary-hover"
        >
          Ver
        </Link>
        <AdjudicateCandidateSheet
          href={`/contracts/new?property_id=${propertyId}&candidate_id=${propertyCandidateId}`}
          fullName={fullName}
          hasLandlord={hasLandlord}
          propertyId={propertyId}
          disabled={!isDone}
          variant="outline"
          triggerClassName="flex-1 rounded-[10px] px-2.5 py-2.5 text-[12.5px] font-bold h-auto"
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
      // "Destructivo = ícono en caja contorneada neutra" — gris, no rojo
      // por defecto; el rojo aparece recién al pasar el mouse, como
      // afordancia, no como estado permanente.
      triggerClassName="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive"
    />
  );
}
