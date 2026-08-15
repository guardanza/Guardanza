"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSheet, BottomSheetContent, BottomSheetDescription, BottomSheetFooter, BottomSheetHeader, BottomSheetTitle } from "@/components/ui/bottom-sheet";

type BlockingReason = "en_proceso" | "en_custodia" | null;

function ConfirmButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}

// "Marcar fuera de cartera" / "Reactivar" — siempre abre un bottom sheet,
// nunca actúa directo (mismo principio que "Nuevo contrato": nunca dejar
// que se sienta como que el botón no hizo nada). El estado ya viene
// resuelto desde el servidor (property.status + si hay un contrato vivo
// bloqueando, y de qué tipo) — acá solo se elige qué contenido mostrar.
// La validación real vuelve a chequearse adentro de set_property_inactive()
// (ver deactivateProperty) — esto es solo para que el mensaje correcto
// aparezca sin un viaje de ida y vuelta fallido.
export function PropertyLifecycleAction({
  propertyId,
  status,
  blockingReason,
  deactivateAction,
  reactivateAction,
}: {
  propertyId: string;
  status: "activa" | "inactiva";
  blockingReason: BlockingReason;
  deactivateAction: (formData: FormData) => void;
  reactivateAction: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);

  if (status === "inactiva") {
    return (
      <>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          Reactivar
        </Button>
        <BottomSheet open={open} onOpenChange={setOpen}>
          <BottomSheetContent>
            <form action={reactivateAction} className="space-y-3">
              <input type="hidden" name="id" value={propertyId} />
              <BottomSheetHeader>
                <BottomSheetTitle>¿Reactivar esta propiedad?</BottomSheetTitle>
                <BottomSheetDescription>Vuelve a quedar activa, dentro de tu cartera.</BottomSheetDescription>
              </BottomSheetHeader>
              <BottomSheetFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <ConfirmButton label="Reactivar" pendingLabel="Reactivando…" />
              </BottomSheetFooter>
            </form>
          </BottomSheetContent>
        </BottomSheet>
      </>
    );
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Marcar fuera de cartera
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          {blockingReason === "en_custodia" ? (
            <>
              <BottomSheetHeader>
                <BottomSheetTitle>No puedes sacar esta propiedad de cartera todavía</BottomSheetTitle>
                <BottomSheetDescription>
                  Esta propiedad tiene una garantía en custodia. No puedes sacarla de cartera hasta cerrar el contrato.
                </BottomSheetDescription>
              </BottomSheetHeader>
              <BottomSheetFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Entendido
                </Button>
              </BottomSheetFooter>
            </>
          ) : blockingReason === "en_proceso" ? (
            <>
              <BottomSheetHeader>
                <BottomSheetTitle>No puedes sacar esta propiedad de cartera todavía</BottomSheetTitle>
                <BottomSheetDescription>
                  Esta propiedad tiene un contrato en proceso. Debes cancelarlo antes de sacarla de cartera.
                </BottomSheetDescription>
              </BottomSheetHeader>
              <BottomSheetFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Entendido
                </Button>
              </BottomSheetFooter>
            </>
          ) : (
            <form action={deactivateAction} className="space-y-3">
              <input type="hidden" name="id" value={propertyId} />
              <BottomSheetHeader>
                <BottomSheetTitle>¿Marcar esta propiedad fuera de cartera?</BottomSheetTitle>
                <BottomSheetDescription>
                  Deja de aparecer entre tus propiedades activas. Puedes reactivarla cuando quieras.
                </BottomSheetDescription>
              </BottomSheetHeader>
              <BottomSheetFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <ConfirmButton label="Marcar fuera de cartera" pendingLabel="Marcando…" />
              </BottomSheetFooter>
            </form>
          )}
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
