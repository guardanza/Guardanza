"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { BottomSheet, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { MissingLandlordNotice } from "@/components/missing-landlord-notice";

// Puerta 1 del flujo guiado (Opción C, punto 6): sin arrendador, no hay
// nada que crear todavía — se bloquea acá mismo en vez de dejar avanzar
// a un formulario. Con arrendador, no hace falta ningún formulario
// nuevo: se navega directo a la sección "Candidatos para arrendar" (ya
// existente, con buscador y adjudicación) con foco y resalte — ese es
// el resto del flujo, sin duplicar nada de esa sección acá.
export function NewContractButton({ propertyId, hasLandlord }: { propertyId: string; hasLandlord: boolean }) {
  const [open, setOpen] = useState(false);

  if (hasLandlord) {
    return (
      <Link
        href={`/properties/${propertyId}?focus=candidatos#candidatos-para-arrendar`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Nuevo contrato
      </Link>
    );
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Nuevo contrato
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          <MissingLandlordNotice propertyId={propertyId} onCancel={() => setOpen(false)} />
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
