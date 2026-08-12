"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";

function ConfirmUndoButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Deshaciendo…
        </>
      ) : (
        "Deshacer adjudicación"
      )}
    </Button>
  );
}

// Deshacer una adjudicación borra el contrato — a diferencia de
// "Cancelar contrato" (que lo deja como registro histórico
// 'cancelado'), esto lo hace desaparecer, como si nunca hubiera
// pasado. Por eso solo existe mientras nadie firmó todavía
// (undo_winning_candidate() lo valida de nuevo del lado de la base,
// esta condición acá es solo para no ofrecer el botón cuando ya no
// aplica).
export function UndoAdjudicationSheet({
  action,
  contractId,
  propertyId,
  tenantName,
}: {
  action: (formData: FormData) => void;
  contractId: string;
  propertyId: string;
  tenantName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Deshacer adjudicación
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          <form action={action} className="space-y-3">
            <input type="hidden" name="contract_id" value={contractId} />
            <input type="hidden" name="property_id" value={propertyId} />
            <BottomSheetHeader>
              <BottomSheetTitle>¿Deshacer la adjudicación de {tenantName}?</BottomSheetTitle>
              <BottomSheetDescription>
                Se eliminará el contrato creado, la propiedad volverá a recibir candidatos y {tenantName} volverá a evaluación. Solo posible si
                nadie ha firmado todavía.
              </BottomSheetDescription>
            </BottomSheetHeader>
            <BottomSheetFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <ConfirmUndoButton />
            </BottomSheetFooter>
          </form>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
