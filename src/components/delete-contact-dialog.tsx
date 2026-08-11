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

function ConfirmDeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Quitando…
        </>
      ) : (
        "Quitar de todos modos"
      )}
    </Button>
  );
}

// "Quitar" es la única acción destructiva de la libreta — antes borraba
// sin preguntar. Las consecuencias reales dependen del estado: una ficha
// pendiente todavía tiene una invitación viva (el token vive en la misma
// fila, así que borrar la fila la deja inservible de inmediato); una
// confirmada ya está vinculada a una cuenta real, pero quitarla de la
// libreta no toca nada de lo ya vinculado (contract_parties, firmas,
// propiedades) — Tanda B separó la libreta de esos permisos a propósito.
//
// Bottom sheet (no modal centrado) para que sea coherente con el resto
// del producto — mismo patrón/componente que la confirmación de plazo
// corto en property-details-form.tsx, la otra confirmación suave de
// "¿estás seguro?" que ya existe.
export function DeleteContactDialog({
  action,
  contactId,
  fullName,
  status,
  tab,
}: {
  action: (formData: FormData) => void;
  contactId: string;
  fullName: string;
  status: "pendiente" | "confirmado";
  tab: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
        Quitar
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          <form action={action} className="space-y-3">
            <input type="hidden" name="id" value={contactId} />
            <input type="hidden" name="tab" value={tab} />
            <BottomSheetHeader>
              <BottomSheetTitle>¿Quitar a {fullName} de tus contactos?</BottomSheetTitle>
              <BottomSheetDescription>
                {status === "pendiente"
                  ? "Se cancela la invitación pendiente — el link deja de funcionar de inmediato."
                  : "No afecta ninguna propiedad, contrato ni firma ya vinculada — solo sale de tu libreta."}
              </BottomSheetDescription>
            </BottomSheetHeader>
            <BottomSheetFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <ConfirmDeleteButton />
            </BottomSheetFooter>
          </form>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
