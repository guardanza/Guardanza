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

function ConfirmCancelButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Cancelando…
        </>
      ) : (
        "Cancelar contrato"
      )}
    </Button>
  );
}

// Cancelar es irreversible (no hay un "descancelar") — pide confirmación
// como cualquier otra acción destructiva del producto. A diferencia de
// "Deshacer adjudicación", el contrato queda como registro histórico
// (estado 'cancelado', no se borra); si venía de una adjudicación, el
// candidato también vuelve a evaluación (cancel_contract() ya lo hace
// del lado de la base), pero eso no siempre aplica -- un contrato creado
// directo, sin evaluación de candidatos detrás, no tiene nada que
// revertir ahí -- así que el copy se queda general.
export function CancelContractSheet({ action }: { action: (formData: FormData) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Cancelar contrato
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          <form action={action} className="space-y-3">
            <BottomSheetHeader>
              <BottomSheetTitle>¿Cancelar este contrato?</BottomSheetTitle>
              <BottomSheetDescription>Esta acción no se puede deshacer — el contrato queda marcado como cancelado.</BottomSheetDescription>
            </BottomSheetHeader>
            <BottomSheetFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Volver
              </Button>
              <ConfirmCancelButton />
            </BottomSheetFooter>
          </form>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
