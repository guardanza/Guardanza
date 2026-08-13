"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveButton } from "@/components/save-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RutInput } from "@/components/rut-input";
import type { RoleBucket } from "@/lib/role-bucket";

const WARNINGS: Record<RoleBucket, string> = {
  arrendatario:
    "Si el usuario administra una organización sin propiedades asociadas, se la quita — la organización en sí no se borra, queda sin nadie a cargo. El rol de arrendatario queda registrado en el perfil de la persona, tenga o no un contrato: su perfil va a mostrar \"Arrendatario(a)\" de inmediato.",
  arrendador:
    "Si el usuario ya administra una organización individual, no hace falta nada más. Si no administra ninguna (o administra una de otro tipo), completa \"Datos de la organización\" abajo — sin nombre, la operación falla con un error y no cambia nada.",
  corredor:
    "Si el usuario ya administra una corredora, no hace falta nada más. Si no administra ninguna (o administra una organización de otro tipo), completa \"Datos de la organización\" abajo (nombre y RUT) — si faltan, la operación falla con un error y no cambia nada.",
};

export function DirectRoleChangeForm({ action }: { action: (formData: FormData) => void }) {
  const [rolNuevo, setRolNuevo] = useState<RoleBucket>("arrendador");

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email del usuario</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rol_nuevo">Rol nuevo</Label>
        <select
          id="rol_nuevo"
          name="rol_nuevo"
          required
          value={rolNuevo}
          onChange={(e) => setRolNuevo(e.target.value as RoleBucket)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="arrendador">Arrendador(a)</option>
          <option value="corredor">Corredor(a)</option>
          <option value="arrendatario">Arrendatario(a)</option>
        </select>
      </div>
      <Alert>
        <AlertDescription>{WARNINGS[rolNuevo]}</AlertDescription>
      </Alert>
      <div className="space-y-1.5">
        <Label htmlFor="motivo">Motivo</Label>
        <Input id="motivo" name="motivo" placeholder="Opcional, queda en el historial" />
      </div>
      {rolNuevo !== "arrendatario" && (
        <div className="space-y-3 rounded-lg border border-input p-2.5">
          <p className="text-sm font-medium">Datos de la organización (solo si hay que crear una nueva)</p>
          <div className="space-y-1.5">
            <Label htmlFor="org_name">Nombre</Label>
            <Input id="org_name" name="org_name" />
          </div>
          {rolNuevo === "corredor" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="org_rut">RUT</Label>
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
        </div>
      )}
      <SaveButton className="w-full">Cambiar rol</SaveButton>
    </form>
  );
}
