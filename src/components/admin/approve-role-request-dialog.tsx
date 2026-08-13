"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/save-button";
import { RutInput } from "@/components/rut-input";
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
import { roleBucketLabel, type RoleBucket } from "@/lib/role-bucket";

export function ApproveRoleRequestDialog({
  action,
  solicitudId,
  rolSolicitado,
  currentOrgLabel,
}: {
  action: (formData: FormData) => void;
  solicitudId: string;
  rolSolicitado: RoleBucket;
  currentOrgLabel: string | null;
}) {
  const needsOrgFields = rolSolicitado !== "arrendatario";

  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" size="sm" />}>Aprobar</DialogTrigger>
      <DialogContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="solicitud_id" value={solicitudId} />
          <input type="hidden" name="rol_solicitado" value={rolSolicitado} />
          <DialogHeader>
            <DialogTitle>Aprobar cambio a {roleBucketLabel(rolSolicitado)}</DialogTitle>
            <DialogDescription>
              {needsOrgFields
                ? currentOrgLabel
                  ? `El usuario ya administra ${currentOrgLabel}. Si es del tipo correcto, no necesitas llenar nada más.`
                  : "El usuario no administra ninguna organización todavía — completa los datos para crear una."
                : "El usuario dejará de administrar cualquier organización con propiedades. Ya validamos que ninguna tenga propiedades asociadas."}
            </DialogDescription>
          </DialogHeader>

          {needsOrgFields && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="org_name">Nombre de la organización</Label>
                <Input id="org_name" name="org_name" placeholder="Solo si hay que crear una nueva" />
              </div>
              {rolSolicitado === "corredor" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="org_rut">RUT de la corredora</Label>
                    <RutInput id="org_rut" name="org_rut" placeholder="12.345.678-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="org_legal_form">Tipo</Label>
                    <select
                      id="org_legal_form"
                      name="org_legal_form"
                      defaultValue="persona_natural"
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="persona_natural">Corredor independiente</option>
                      <option value="empresa">Oficina de corretaje</option>
                    </select>
                  </div>
                </>
              )}
            </>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <SaveButton>Confirmar aprobación</SaveButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
