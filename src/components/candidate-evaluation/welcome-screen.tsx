import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { participantInviteTitle, participantInviteMessage, type CandidateParticipantType } from "@/lib/candidate-participant-messaging";
import { formatMoney, type MoneyCurrency } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Pantalla 1 (spec sección 5): correo verificado, saludo, rol
// destacado, resumen de propiedad, expectativa de tiempo. El mensaje
// según rol es el mismo de la Etapa 2 (participantInviteMessage) — no
// se reescribe acá, para que diga exactamente lo mismo que ya leyó en
// el correo antes de llegar a esta pantalla.
export function WelcomeScreen({
  fullName,
  email,
  participantType,
  propertyAddress,
  inviterName,
  rentAmount,
  rentCurrency,
  guaranteeAmount,
  guaranteeCurrency,
  startHref,
}: {
  fullName: string;
  email: string;
  participantType: CandidateParticipantType;
  propertyAddress: string;
  inviterName: string;
  rentAmount: number | null;
  rentCurrency: MoneyCurrency | null;
  guaranteeAmount: number | null;
  guaranteeCurrency: MoneyCurrency | null;
  startHref: string;
}) {
  const isCodeudor = participantType === "codeudor";
  const message = participantInviteMessage(participantType, { propertyAddress, inviterName });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4 shrink-0 text-success" />
        <span className="truncate">{email}</span>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Hola, {fullName}</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">{participantInviteTitle(participantType)}</h2>
      </div>

      <p
        className={cn(
          "text-sm leading-relaxed",
          isCodeudor ? "rounded-lg border border-brand-gold/40 bg-brand-gold/5 p-3 text-foreground" : "text-muted-foreground"
        )}
      >
        {message}
      </p>

      {(rentAmount || guaranteeAmount) && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border p-4">
          {rentAmount && rentCurrency && (
            <div>
              <p className="text-xs text-muted-foreground">Arriendo</p>
              <p className="font-medium">{formatMoney(rentAmount, rentCurrency)}</p>
            </div>
          )}
          {guaranteeAmount && guaranteeCurrency && (
            <div>
              <p className="text-xs text-muted-foreground">Garantía</p>
              <p className="font-medium">{formatMoney(guaranteeAmount, guaranteeCurrency)}</p>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">Te toma unos 10 minutos.</p>

      <Link href={startHref} className={buttonVariants({ className: "w-full" })}>
        Empezar
      </Link>
    </div>
  );
}
