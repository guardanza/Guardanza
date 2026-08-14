import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { BottomSheetDescription, BottomSheetFooter, BottomSheetHeader, BottomSheetTitle } from "@/components/ui/bottom-sheet";

// Contenido compartido del bottom sheet de bloqueo — mismo mensaje sea
// que se llegue desde "Nuevo contrato" o desde "Adjudicar" en un
// candidato, así ambas puertas de entrada a la creación del contrato
// avisan lo mismo. Solo GUÍA a la sección de arrendadores que ya existe
// en /properties/[id]/edit — no rediseña cómo se asigna un arrendador.
export function MissingLandlordNotice({ propertyId, onCancel }: { propertyId: string; onCancel: () => void }) {
  return (
    <>
      <BottomSheetHeader>
        <BottomSheetTitle>Primero debes asignar un arrendador</BottomSheetTitle>
        <BottomSheetDescription>
          Esta propiedad todavía no tiene un arrendador (dueño) asignado — sin eso no se puede crear el contrato.
        </BottomSheetDescription>
      </BottomSheetHeader>
      <BottomSheetFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Link href={`/properties/${propertyId}/edit`} className={buttonVariants()}>
          Ir a arrendadores
        </Link>
      </BottomSheetFooter>
    </>
  );
}
