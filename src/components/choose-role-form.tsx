"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { chooseRole } from "@/lib/actions/auth";
import { ROLE_OPTIONS, type RoleOption } from "@/lib/role-options";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Versión simplificada del wizard de /signup — no hace falta elegir
// Google vs. Email (la sesión ya existe) ni pedir contraseña, solo el rol
// y, para corredor, los datos que Google no entrega.
export function ChooseRoleForm() {
  const [selected, setSelected] = useState<RoleOption | null>(null);
  const isCorredor = selected?.role === "corredor";

  if (!selected) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ROLE_OPTIONS.map((opt) => (
          <button key={`${opt.role}-${opt.legalForm}`} type="button" onClick={() => setSelected(opt)} className="text-left">
            <Card className="h-full transition-colors hover:border-primary">
              <CardContent className="space-y-1.5">
                <opt.icon className="size-5 text-primary" strokeWidth={2} />
                <p className="text-sm font-medium">{opt.title}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-3">
      <button
        type="button"
        onClick={() => setSelected(null)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Cambiar tipo de cuenta
      </button>
      <p className="text-sm font-medium">{selected.title}</p>

      <form action={chooseRole} className="space-y-3">
        <input type="hidden" name="role" value={selected.role} />
        <input type="hidden" name="legal_form" value={selected.legalForm} />

        {isCorredor && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="company_name">{selected.legalForm === "empresa" ? "Nombre de la oficina" : "Nombre comercial"}</Label>
              <Input id="company_name" name="company_name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rut">RUT</Label>
              <Input id="rut" name="rut" placeholder="12.345.678-9" required />
            </div>
          </>
        )}

        <Button type="submit" className="w-full">
          Continuar
        </Button>
      </form>
    </div>
  );
}
