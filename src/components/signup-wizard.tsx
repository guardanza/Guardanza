"use client";

import { useState } from "react";
import { Building2, User, Home, KeyRound, ArrowLeft } from "lucide-react";
import { signUpWithRole } from "@/lib/actions/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Role = "arrendador" | "corredor" | "arrendatario";
type LegalForm = "persona_natural" | "empresa" | "";

const ROLE_OPTIONS: { role: Role; legalForm: LegalForm; title: string; description: string; icon: typeof User }[] = [
  { role: "arrendador", legalForm: "", title: "Arrendador", description: "Tengo una propiedad y la arriendo yo mismo.", icon: Home },
  {
    role: "corredor",
    legalForm: "persona_natural",
    title: "Corredor independiente",
    description: "Corredor de propiedades por cuenta propia.",
    icon: User,
  },
  {
    role: "corredor",
    legalForm: "empresa",
    title: "Oficina de corretaje",
    description: "Administro propiedades de varios clientes.",
    icon: Building2,
  },
  { role: "arrendatario", legalForm: "", title: "Arrendatario", description: "Estoy arrendando o buscando arriendo.", icon: KeyRound },
];

export function SignupWizard({ initialRole, initialLegalForm }: { initialRole?: string; initialLegalForm?: string }) {
  const preset = ROLE_OPTIONS.find((o) => o.role === initialRole && o.legalForm === (initialLegalForm ?? ""));
  const [selected, setSelected] = useState<(typeof ROLE_OPTIONS)[number] | null>(preset ?? null);

  if (!selected) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">¿Qué tipo de cuenta necesitas?</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ROLE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={`${opt.role}-${opt.legalForm}`}
                type="button"
                onClick={() => setSelected(opt)}
                className="text-left"
              >
                <Card className="h-full transition-colors hover:border-primary">
                  <CardContent className="space-y-1.5">
                    <Icon className="size-5 text-primary" strokeWidth={2} />
                    <p className="text-sm font-medium">{opt.title}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const isCorredor = selected.role === "corredor";

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setSelected(null)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Cambiar tipo de cuenta
      </button>
      <p className="text-sm font-medium">{selected.title}</p>

      <form action={signUpWithRole} className="space-y-3">
        <input type="hidden" name="role" value={selected.role} />
        <input type="hidden" name="legal_form" value={selected.legalForm} />

        <div className="space-y-1.5">
          <Label htmlFor="full_name">Nombre completo</Label>
          <Input id="full_name" name="full_name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" required minLength={6} />
        </div>

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
          Crear cuenta
        </Button>

        <Button type="button" variant="outline" className="w-full" disabled title="Próximamente">
          Continuar con Google (próximamente)
        </Button>
      </form>
    </div>
  );
}
