"use client";

import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { roleBucketLabel, type RoleBucket } from "@/lib/role-bucket";

const ALL_ROLES: RoleBucket[] = ["arrendador", "corredor", "arrendatario"];

export function RoleChangeRequestDialog({
  action,
  currentBucket,
  currentLabel,
  activeContractsCount,
}: {
  action: (formData: FormData) => void;
  currentBucket: RoleBucket;
  currentLabel: string;
  activeContractsCount: number;
}) {
  const options = ALL_ROLES.filter((r) => r !== currentBucket);
  const [rolSolicitado, setRolSolicitado] = useState<RoleBucket>(options[0]);

  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        Solicitar cambio de rol
      </DialogTrigger>
      <DialogContent>
        <form action={action} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Solicitar cambio de rol</DialogTitle>
            <DialogDescription>
              Tu rol lo cambia un administrador de Guardanza, no tú directamente. Esta solicitud queda pendiente
              hasta que la revisen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label>Rol actual</Label>
            <p className="rounded-lg border border-input bg-muted/50 px-2.5 py-2 text-sm text-muted-foreground">
              {currentLabel}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rol_solicitado">Rol que quieres tener</Label>
            <input type="hidden" name="rol_solicitado" value={rolSolicitado} />
            <Select value={rolSolicitado} onValueChange={(v) => setRolSolicitado(v as RoleBucket)}>
              <SelectTrigger id="rol_solicitado" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleBucketLabel(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea id="motivo" name="motivo" maxLength={500} placeholder="Cuéntanos por qué quieres el cambio." />
          </div>

          {activeContractsCount > 0 && (
            <p className="rounded-lg bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
              Tienes {activeContractsCount} contrato{activeContractsCount === 1 ? "" : "s"} activo
              {activeContractsCount === 1 ? "" : "s"}. Cambiar tu rol no los afecta — tu historial en ellos se
              mantiene igual.
            </p>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <SaveButton>Enviar solicitud</SaveButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
