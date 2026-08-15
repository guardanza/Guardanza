"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { BottomSheet, BottomSheetContent, BottomSheetDescription, BottomSheetFooter, BottomSheetHeader, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { MissingLandlordNotice } from "@/components/missing-landlord-notice";
import { AdjudicateConfirmContent } from "@/components/candidate-decision-sheets";

type ReadyCandidate = { id: string; fullName: string };

// "Nuevo contrato" nunca salta en silencio: siempre abre un bottom sheet
// que dice en qué estado está la propiedad y cuál es el siguiente paso —
// el salto mudo a la sección de candidatos (solo un resalte de borde)
// se sentía, en la práctica, como que el botón "no hacía nada". Cuatro
// estados, sin tocar nada de lo que ya funciona por debajo:
//
// 1. Sin arrendador — el aviso de siempre (MissingLandlordNotice).
// 2. Un candidato listo — mismo "Adjudicar" y misma confirmación que ya
//    usa la fila del candidato (AdjudicateConfirmContent, compartido),
//    para no duplicar esa copy en dos lugares.
// 3. Varios candidatos listos — se listan por nombre y se lleva a
//    elegir; adjudicar es decisión del corredor, nunca se elige uno acá.
// 4. Con arrendador pero sin nadie listo todavía (sin candidatos, o
//    candidatos aún sin confirmar cuenta) — mensaje breve + el mismo
//    salto con foco y resalte de siempre; el detalle de por qué cada
//    candidato no puede ganar todavía lo sigue explicando esa sección.
//
// "Ver candidato(s)" reusa el mecanismo existente (navegar a
// ?focus=candidatos#candidatos-para-arrendar, que dispara
// ScrollIntoViewOnMount y el resalte de la Card) — no uno nuevo.
export function NewContractButton({
  propertyId,
  hasLandlord,
  readyCandidates,
}: {
  propertyId: string;
  hasLandlord: boolean;
  readyCandidates: ReadyCandidate[];
}) {
  const [open, setOpen] = useState(false);
  const candidatesHref = `/properties/${propertyId}?focus=candidatos#candidatos-para-arrendar`;

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Nuevo contrato
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          {!hasLandlord ? (
            <MissingLandlordNotice propertyId={propertyId} onCancel={() => setOpen(false)} />
          ) : readyCandidates.length === 1 ? (
            <AdjudicateConfirmContent
              href={`/contracts/new?property_id=${propertyId}&candidate_id=${readyCandidates[0].id}`}
              fullName={readyCandidates[0].fullName}
              onCancel={() => setOpen(false)}
            />
          ) : readyCandidates.length > 1 ? (
            <>
              <BottomSheetHeader>
                <BottomSheetTitle>Tienes {readyCandidates.length} candidatos listos para adjudicar</BottomSheetTitle>
                <BottomSheetDescription>
                  {readyCandidates.map((c) => c.fullName).join(", ")} — elige a quién adjudicarle la propiedad.
                </BottomSheetDescription>
              </BottomSheetHeader>
              <BottomSheetFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Link href={candidatesHref} className={buttonVariants()} onClick={() => setOpen(false)}>
                  Ver candidatos
                </Link>
              </BottomSheetFooter>
            </>
          ) : (
            <>
              <BottomSheetHeader>
                <BottomSheetTitle>Todavía no hay nadie listo para adjudicar</BottomSheetTitle>
                <BottomSheetDescription>Agrega o adjudica un candidato para crear el contrato.</BottomSheetDescription>
              </BottomSheetHeader>
              <BottomSheetFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Link href={candidatesHref} className={buttonVariants()} onClick={() => setOpen(false)}>
                  Ver candidatos
                </Link>
              </BottomSheetFooter>
            </>
          )}
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
