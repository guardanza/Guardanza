"use client";

import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { participantInviteTitle, type CandidateParticipantType } from "@/lib/candidate-participant-messaging";

// Nada acá todavía usa participant_type para mostrar texto distinto —
// reusa el mismo título corto de participantInviteTitle (Etapa 2) en
// vez de inventar una segunda redacción para lo mismo.
export function PendingEvaluationsBell({
  evaluations,
}: {
  evaluations: { id: string; propertyAddress: string; participantType: CandidateParticipantType }[];
}) {
  const router = useRouter();

  // Sin pendientes, ni el ícono aparece — no hay nada que avisar, y así
  // no le agrega ruido a la enorme mayoría de cuentas que nunca van a
  // tener una evaluación de papeles propia.
  if (evaluations.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-muted" aria-label="Notificaciones">
        <Bell className="size-4.5" strokeWidth={1.75} />
        <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground tabular-nums">
          {evaluations.length}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Evaluaciones pendientes</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {evaluations.map((ev) => (
            <DropdownMenuItem key={ev.id} onClick={() => router.push(`/evaluacion/postulacion/${ev.id}`)}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{participantInviteTitle(ev.participantType)}</p>
                <p className="truncate text-xs text-muted-foreground">{ev.propertyAddress}</p>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
