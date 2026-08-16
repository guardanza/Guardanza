"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSheet, BottomSheetContent, BottomSheetDescription, BottomSheetFooter, BottomSheetHeader, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import type { ContractBlockingReason } from "@/lib/property-status";

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

// Contenido del bottom sheet de "Marcar fuera de cartera"/"Reactivar" —
// separado del botón que lo dispara (PropertyLifecycleAction, más abajo)
// para que el menú de tres puntitos de la lista (PropertyRowMenu) pueda
// reusar exactamente el mismo contenido, sin duplicar los tres mensajes
// ni la lógica de qué mostrar. El estado (bloqueada, por qué, o lista
// para confirmar) ya viene resuelto desde el servidor — acá solo se
// elige qué mostrar. La validación real vuelve a chequearse adentro de
// set_property_inactive() (ver deactivateProperty) — esto es solo para
// que el mensaje correcto aparezca sin un viaje de ida y vuelta fallido.
export function PropertyLifecycleSheetBody({
  propertyId,
  status,
  blockingReason,
  deactivateAction,
  reactivateAction,
  onClose,
}: {
  propertyId: string;
  status: "activa" | "inactiva";
  blockingReason: ContractBlockingReason | null;
  deactivateAction: (formData: FormData) => void;
  reactivateAction: (formData: FormData) => void;
  onClose: () => void;
}) {
  if (status === "inactiva") {
    return (
      <form action={reactivateAction} className="space-y-3">
        <input type="hidden" name="id" value={propertyId} />
        <BottomSheetHeader>
          <BottomSheetTitle>¿Reactivar esta propiedad?</BottomSheetTitle>
          <BottomSheetDescription>Vuelve a quedar activa, dentro de tu cartera.</BottomSheetDescription>
        </BottomSheetHeader>
        <BottomSheetFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <ConfirmButton label="Reactivar" pendingLabel="Reactivando…" />
        </BottomSheetFooter>
      </form>
    );
  }

  if (blockingReason === "en_custodia") {
    return (
      <>
        <BottomSheetHeader>
          <BottomSheetTitle>No puedes sacar esta propiedad de cartera todavía</BottomSheetTitle>
          <BottomSheetDescription>
            Esta propiedad tiene una garantía en custodia. No puedes sacarla de cartera hasta cerrar el contrato.
          </BottomSheetDescription>
        </BottomSheetHeader>
        <BottomSheetFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Entendido
          </Button>
        </BottomSheetFooter>
      </>
    );
  }

  if (blockingReason === "en_proceso") {
    return (
      <>
        <BottomSheetHeader>
          <BottomSheetTitle>No puedes sacar esta propiedad de cartera todavía</BottomSheetTitle>
          <BottomSheetDescription>
            Esta propiedad tiene un contrato en proceso. Debes cancelarlo antes de sacarla de cartera.
          </BottomSheetDescription>
        </BottomSheetHeader>
        <BottomSheetFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Entendido
          </Button>
        </BottomSheetFooter>
      </>
    );
  }

  return (
    <form action={deactivateAction} className="space-y-3">
      <input type="hidden" name="id" value={propertyId} />
      <BottomSheetHeader>
        <BottomSheetTitle>¿Marcar esta propiedad fuera de cartera?</BottomSheetTitle>
        <BottomSheetDescription>Deja de aparecer entre tus propiedades activas. Puedes reactivarla cuando quieras.</BottomSheetDescription>
      </BottomSheetHeader>
      <BottomSheetFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <ConfirmButton label="Marcar fuera de cartera" pendingLabel="Marcando…" />
      </BottomSheetFooter>
    </form>
  );
}

// "Marcar fuera de cartera" / "Reactivar" — siempre abre un bottom sheet,
// nunca actúa directo (mismo principio que "Nuevo contrato": nunca dejar
// que se sienta como que el botón no hizo nada). Usado en la ficha de
// propiedad; el menú de tres puntitos de la lista (PropertyRowMenu) usa
// el mismo PropertyLifecycleSheetBody con su propio disparador.
export function PropertyLifecycleAction({
  propertyId,
  status,
  blockingReason,
  deactivateAction,
  reactivateAction,
}: {
  propertyId: string;
  status: "activa" | "inactiva";
  blockingReason: ContractBlockingReason | null;
  deactivateAction: (formData: FormData) => void;
  reactivateAction: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {status === "inactiva" ? "Reactivar" : "Marcar fuera de cartera"}
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          <PropertyLifecycleSheetBody
            propertyId={propertyId}
            status={status}
            blockingReason={blockingReason}
            deactivateAction={deactivateAction}
            reactivateAction={reactivateAction}
            onClose={() => setOpen(false)}
          />
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
