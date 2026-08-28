"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

// Menú de acciones por contacto (···) — mismo patrón que PropertyRowMenu
// en la lista de Propiedades: un disparador visible arriba a la derecha
// de la fila, nada de gestos ocultos tipo swipe (el corredor mayor no los
// descubre).
//
// Por qué un menú y no botones en la tarjeta: "Quitar" es raro y
// destructivo, y como botón suelto pesaba igual que la acción principal
// (entrar al detalle) además de quedar bajo el pulgar. Acá queda a un
// nivel de profundidad — hay que abrir el menú y recién ahí elegirlo —
// y encima conserva la confirmación en bottom sheet de siempre. Reenviar
// se va con él por el mismo motivo: también es secundario.
//
// Reenviar es un server action, así que necesita un <form> de verdad: va
// oculto como hermano del menú (no adentro del DropdownMenuContent, que
// se renderiza en un portal) y el ítem lo dispara con requestSubmit(),
// mismo patrón de formulario auto-enviado que ya usan los buscadores.
export function ContactRowMenu({
  contactId,
  fullName,
  status,
  tab,
  deleteAction,
  resendAction,
}: {
  contactId: string;
  fullName: string;
  status: "pendiente" | "confirmado";
  tab: string;
  deleteAction: (formData: FormData) => void;
  resendAction: (formData: FormData) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const resendRef = useRef<HTMLFormElement>(null);
  const canResend = status === "pendiente";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground"
              aria-label={`Más acciones para ${fullName}`}
              title="Más acciones"
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canResend && <DropdownMenuItem onClick={() => resendRef.current?.requestSubmit()}>Reenviar invitación</DropdownMenuItem>}
          <DropdownMenuItem variant="destructive" onClick={() => setSheetOpen(true)}>
            Quitar de mis contactos
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {canResend && (
        <form ref={resendRef} action={resendAction} className="hidden">
          <input type="hidden" name="id" value={contactId} />
          <input type="hidden" name="tab" value={tab} />
        </form>
      )}

      {/* Misma confirmación de siempre, palabra por palabra — lo que
          cambió es de dónde se llega a ella, no lo que advierte. Una ficha
          pendiente todavía tiene una invitación viva (el token vive en la
          misma fila, así que borrarla la deja inservible al instante); una
          confirmada ya está vinculada a una cuenta, pero quitarla de la
          libreta no toca nada de lo ya vinculado (contract_parties,
          firmas, propiedades). */}
      <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <BottomSheetContent>
          <form action={deleteAction} className="space-y-3">
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
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
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
