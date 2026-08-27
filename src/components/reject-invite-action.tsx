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

function ConfirmRejectButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Rechazando…
        </>
      ) : (
        "Rechazar invitación"
      )}
    </Button>
  );
}

// Rechazar vive en esta misma página (nunca un link directo en el correo
// — un escáner de seguridad de correo o el preview de un cliente de mail
// puede "visitar" un link por su cuenta; si ese GET disparara el rechazo,
// alguien podría quedar rechazado sin haber tocado nada). Acá sí es una
// acción explícita: bottom sheet de confirmación, mismo patrón que
// DeleteContactDialog — nada de gestos ocultos, un botón visible con su
// propia pregunta antes de actuar.
export function RejectInviteAction({ action, token }: { action: (formData: FormData) => void; token: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="link" size="sm" className="text-muted-foreground" onClick={() => setOpen(true)}>
        Rechazar esta invitación
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          <form action={action} className="space-y-3">
            <input type="hidden" name="token" value={token} />
            <BottomSheetHeader>
              <BottomSheetTitle>¿Rechazar esta invitación?</BottomSheetTitle>
              <BottomSheetDescription>
                Le avisamos a quien te invitó. Si cambias de opinión, puedes pedirle que te la reenvíe.
              </BottomSheetDescription>
            </BottomSheetHeader>
            <BottomSheetFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <ConfirmRejectButton />
            </BottomSheetFooter>
          </form>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
