"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";

function ConfirmDeletePropertyButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Eliminando…
        </>
      ) : (
        "Eliminar de todos modos"
      )}
    </Button>
  );
}

// Eliminar una propiedad hoy borraba directo, sin preguntar. La
// consecuencia real: properties→property_candidates y
// properties→property_landlords son ON DELETE CASCADE (se van con la
// propiedad, sin tocar la libreta), pero properties→contracts es ON
// DELETE RESTRICT — si tiene un contrato asociado, la base rechaza el
// borrado (deleteProperty ya interpreta ese error). El copy adelanta
// ambas cosas para que no sea sorpresa ninguna de las dos.
export function DeletePropertyDialog({
  action,
  propertyId,
  address,
}: {
  action: (formData: FormData) => void;
  propertyId: string;
  address: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 /> Eliminar
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          <form action={action} className="space-y-3">
            <input type="hidden" name="id" value={propertyId} />
            <BottomSheetHeader>
              <BottomSheetTitle>¿Eliminar {address}?</BottomSheetTitle>
              <BottomSheetDescription>
                Se eliminan sus candidatos y vínculos con propietarios. Si tiene un contrato asociado, no se puede eliminar.
              </BottomSheetDescription>
            </BottomSheetHeader>
            <BottomSheetFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <ConfirmDeletePropertyButton />
            </BottomSheetFooter>
          </form>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
