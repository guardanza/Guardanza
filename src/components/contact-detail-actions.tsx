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

function ResendButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Reenviando…
        </>
      ) : (
        "Reenviar invitación"
      )}
    </Button>
  );
}

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

// Acciones al final de la ficha de detalle — antes vivían en un menú
// (···) sobre la tarjeta de la lista. "Quitar" es rara y destructiva:
// que haga falta ENTRAR al contacto (la flechita, que ya existía) para
// encontrarla es justamente el punto — un paso más de intención antes de
// llegar ahí, sin depender de un menú que igual había que abrir.
// "Reenviar" se muda con ella por el mismo motivo: ya no hay ningún
// menú de acciones en la lista donde vivir.
export function ContactDetailActions({
  contactId,
  fullName,
  status,
  role,
  returnTo,
  deleteAction,
  resendAction,
}: {
  contactId: string;
  fullName: string;
  status: "pendiente" | "confirmado";
  role: string;
  returnTo: string;
  deleteAction: (formData: FormData) => void;
  resendAction: (formData: FormData) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="space-y-3 border-t pt-6">
      {status === "pendiente" && (
        <form action={resendAction}>
          <input type="hidden" name="id" value={contactId} />
          <input type="hidden" name="tab" value={role} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <ResendButton />
        </form>
      )}

      <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setSheetOpen(true)}>
        Quitar de mis contactos
      </Button>

      {/* Misma confirmación de siempre, palabra por palabra. Una ficha
          pendiente todavía tiene una invitación viva (el token vive en la
          misma fila, así que borrarla la deja inservible al instante); una
          confirmada ya está vinculada a una cuenta, pero quitarla de la
          libreta no toca nada de lo ya vinculado (contract_parties,
          firmas, propiedades). Vuelve a la LISTA al confirmar, no a esta
          misma ficha — la ficha deja de existir apenas se quita. */}
      <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <BottomSheetContent>
          <form action={deleteAction} className="space-y-3">
            <input type="hidden" name="id" value={contactId} />
            <input type="hidden" name="tab" value={role} />
            <BottomSheetHeader>
              <BottomSheetTitle>¿Quitar a {fullName} de tus contactos?</BottomSheetTitle>
              <BottomSheetDescription>
                {status === "pendiente"
                  ? "Se cancela la invitación pendiente — el link deja de funcionar de inmediato."
                  : "No afecta ninguna propiedad, contrato ni firma ya vinculada — solo sale de tu libreta."}
              </BottomSheetDescription>
            </BottomSheetHeader>
            <BottomSheetFooter>
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                Cancelar
              </Button>
              <ConfirmDeleteButton />
            </BottomSheetFooter>
          </form>
        </BottomSheetContent>
      </BottomSheet>
    </div>
  );
}
