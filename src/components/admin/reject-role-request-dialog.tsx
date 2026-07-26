"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/save-button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RejectRoleRequestDialog({
  action,
  solicitudId,
}: {
  action: (formData: FormData) => void;
  solicitudId: string;
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>Rechazar</DialogTrigger>
      <DialogContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="solicitud_id" value={solicitudId} />
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
            <DialogDescription>El usuario verá este motivo en su perfil.</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="motivo_rechazo">Motivo (opcional)</Label>
            <Textarea id="motivo_rechazo" name="motivo_rechazo" maxLength={500} />
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <SaveButton className="bg-destructive text-white hover:bg-destructive/90">Confirmar rechazo</SaveButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
