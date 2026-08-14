"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import { MissingLandlordNotice } from "@/components/missing-landlord-notice";

// "Adjudicar" (antes "Elegir ganador") sigue siendo, hoy, una navegación
// simple — la creación real del contrato pasa recién en /contracts/new
// (select_winning_candidate(), ver candidates.ts), no acá. La
// confirmación previa existe para que quede claro, antes de saltar a ese
// formulario, que se trata de dejar fuera de carrera al resto de los
// candidatos y ocupar la propiedad — no un simple "ver más detalles".
//
// hasLandlord cierra un hueco real: select_winning_candidate() arma el
// contrato con el admin de properties.organization_id como arrendador,
// sin validar que esa organización sea un arrendador individual de
// verdad (podría ser la propia corredora, si la propiedad se cargó sin
// un arrendador aparte) — hoy eso dejaba crear un contrato sin
// arrendador real. Acá se ataja en la UI, en las dos puertas de entrada
// a la creación (esta y "Nuevo contrato"), sin tocar esa función.
export function AdjudicateCandidateSheet({
  href,
  fullName,
  hasLandlord,
  propertyId,
}: {
  href: string;
  fullName: string;
  hasLandlord: boolean;
  propertyId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Adjudicar
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          {hasLandlord ? (
            <>
              <BottomSheetHeader>
                <BottomSheetTitle>¿Adjudicar la propiedad a {fullName}?</BottomSheetTitle>
                <BottomSheetDescription>
                  Se creará el contrato con esta persona como arrendatario(a) y la propiedad quedará ocupada.
                </BottomSheetDescription>
              </BottomSheetHeader>
              <BottomSheetFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Link href={href} className={buttonVariants()}>
                  Adjudicar
                </Link>
              </BottomSheetFooter>
            </>
          ) : (
            <MissingLandlordNotice propertyId={propertyId} onCancel={() => setOpen(false)} />
          )}
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}

function ConfirmDiscardButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Descartando…
        </>
      ) : (
        "Descartar"
      )}
    </Button>
  );
}

// "Descartar" (antes "No seleccionado") solo cambia el status de ESTE
// candidato en ESTA propiedad (markCandidateNotSelected) — no toca la
// ficha de la persona en la libreta ni sus otras candidaturas, y ya
// existe "Reactivar" para deshacerlo. La confirmación existe igual,
// porque saca a alguien de carrera y eso puede no ser obvio de un vistazo.
export function DiscardCandidateSheet({
  action,
  candidateId,
  propertyId,
  fullName,
}: {
  action: (formData: FormData) => void;
  candidateId: string;
  propertyId: string;
  fullName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Descartar
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          <form action={action} className="space-y-3">
            <input type="hidden" name="id" value={candidateId} />
            <input type="hidden" name="property_id" value={propertyId} />
            <BottomSheetHeader>
              <BottomSheetTitle>¿Descartar a {fullName} como candidato(a) de esta propiedad?</BottomSheetTitle>
              <BottomSheetDescription>
                Seguirá disponible en tu libreta y podrás sumarla a otras propiedades.
              </BottomSheetDescription>
            </BottomSheetHeader>
            <BottomSheetFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <ConfirmDiscardButton />
            </BottomSheetFooter>
          </form>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
