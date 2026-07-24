"use client";

import { useState } from "react";
import { Building2, User, Home, KeyRound, ArrowLeft, Mail } from "lucide-react";
import { signUpWithRole, signInWithGoogle } from "@/lib/actions/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/google-icon";

type Role = "arrendador" | "corredor" | "arrendatario";
type LegalForm = "persona_natural" | "empresa" | "";
type RoleOption = { role: Role; legalForm: LegalForm; title: string; description: string; icon: typeof User };
type Step = "roles" | "choice" | "corredor-google" | "form";

function GoogleBadge() {
  return (
    <span className="flex size-5 items-center justify-center rounded-full bg-white">
      <GoogleIcon className="size-3" />
    </span>
  );
}

const ROLE_OPTIONS: RoleOption[] = [
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

// Role first, then channel (Google vs Email) — asking "what type of account"
// before "how do you want to sign up" so the answer to the first question
// can actually shape the second (corredor + Google needs an extra step to
// collect company_name/rut, since Google doesn't hand those over).
//
// Arriving with a preset role (from a persona landing page's "Registrarme
// como corredor" link) skips the roles step — that choice was already made
// by which page's CTA was clicked — but still lands on "choice", not the
// form directly, so Google stays available from those entry points too.
export function SignupWizard({ initialRole, initialLegalForm }: { initialRole?: string; initialLegalForm?: string }) {
  const preset = ROLE_OPTIONS.find((o) => o.role === initialRole && o.legalForm === (initialLegalForm ?? ""));
  const [step, setStep] = useState<Step>(preset ? "choice" : "roles");
  const [selected, setSelected] = useState<RoleOption | null>(preset ?? null);

  if (step === "roles" || !selected) {
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
                onClick={() => {
                  setSelected(opt);
                  setStep("choice");
                }}
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

  if (step === "choice") {
    return (
      <div className="animate-fade-in-up space-y-3">
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setStep("roles");
          }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Cambiar tipo de cuenta
        </button>
        <p className="text-sm font-medium">{selected.title}</p>

        {isCorredor ? (
          <Button type="button" className="w-full" onClick={() => setStep("corredor-google")}>
            <GoogleBadge />
            Registrarse con Google
          </Button>
        ) : (
          <form action={signInWithGoogle}>
            <input type="hidden" name="role" value={selected.role} />
            <input type="hidden" name="legal_form" value={selected.legalForm} />
            <Button type="submit" className="w-full">
              <GoogleBadge />
              Registrarse con Google
            </Button>
          </form>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />O<div className="h-px flex-1 bg-border" />
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={() => setStep("form")}>
          <Mail /> Registrarse con Email
        </Button>
      </div>
    );
  }

  if (step === "corredor-google") {
    return (
      <div className="animate-fade-in-up space-y-3">
        <button
          type="button"
          onClick={() => setStep("choice")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Atrás
        </button>
        <p className="text-sm font-medium">{selected.title}</p>
        <p className="text-xs text-muted-foreground">Google no nos da estos datos, así que los pedimos antes de continuar.</p>

        <form action={signInWithGoogle} className="space-y-3">
          <input type="hidden" name="role" value={selected.role} />
          <input type="hidden" name="legal_form" value={selected.legalForm} />

          <div className="space-y-1.5">
            <Label htmlFor="google_company_name">{selected.legalForm === "empresa" ? "Nombre de la oficina" : "Nombre comercial"}</Label>
            <Input id="google_company_name" name="company_name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="google_rut">RUT</Label>
            <Input id="google_rut" name="rut" placeholder="12.345.678-9" required />
          </div>

          <Button type="submit" className="w-full">
            <GoogleBadge />
            Continuar con Google
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-3">
      <button type="button" onClick={() => setStep("choice")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Atrás
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
          <Input id="password" name="password" type="password" required minLength={8} />
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, una mayúscula y un número.</p>
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
      </form>
    </div>
  );
}
