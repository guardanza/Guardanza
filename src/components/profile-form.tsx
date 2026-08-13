"use client";

import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveButton } from "@/components/save-button";
import { RutInput } from "@/components/rut-input";
import { PhoneInput } from "@/components/phone-input";
import { InfoTooltip } from "@/components/info-tooltip";
import { validateRut } from "@/lib/rut";

const NAME_PATTERN = /^[A-Za-zÀ-ÿ\s]{1,50}$/;

export function ProfileForm({
  action,
  provider,
  email,
  initialFullName,
  initialRut,
  initialPhone,
  rutHighlighted,
  next,
}: {
  action: (formData: FormData) => void;
  provider: "google" | "email";
  email: string;
  initialFullName: string;
  initialRut: string;
  initialPhone: string;
  rutHighlighted?: boolean;
  next?: string;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [rut, setRut] = useState(initialRut);
  const [phone, setPhone] = useState(initialPhone);
  const [phoneError, setPhoneError] = useState(false);

  const dirty = fullName !== initialFullName || rut !== initialRut || phone !== initialPhone;
  const nameError = provider === "email" && fullName.length > 0 && !NAME_PATTERN.test(fullName);
  const rutError = rut.length > 0 && !validateRut(rut);

  const rutSectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (rutHighlighted) rutSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [rutHighlighted]);

  return (
    <form action={action} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Input id="email" value={email} disabled className="bg-muted pr-8" />
          <Lock className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
        </div>
        <p className="text-xs text-muted-foreground">
          Es la identidad de tu cuenta — cambiarlo va a requerir verificación por correo, algo que todavía no está disponible.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="full_name">Nombre completo</Label>
        {provider === "google" ? (
          <>
            <div className="relative">
              <Input id="full_name" name="full_name" value={fullName} disabled className="bg-muted pr-8" />
              <Lock className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
            </div>
            <p className="text-xs text-muted-foreground">Tu nombre está gestionado por tu cuenta de Google.</p>
          </>
        ) : (
          <>
            <Input
              id="full_name"
              name="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value.slice(0, 50))}
              maxLength={50}
              aria-invalid={nameError}
              required
            />
            {nameError && <p className="text-xs text-destructive">Solo letras y espacios, máximo 50 caracteres.</p>}
          </>
        )}
      </div>

      <div
        ref={rutSectionRef}
        className={`space-y-1.5 rounded-lg transition-colors duration-500 ${rutHighlighted ? "-m-2 bg-brand-gold/10 p-2 ring-1 ring-brand-gold/40" : ""}`}
      >
        <div className="flex items-center gap-1.5">
          <Label htmlFor="rut">RUT</Label>
          <InfoTooltip text="Aplica validación de RUT" />
        </div>
        <RutInput id="rut" defaultValue={rut} onValueChange={setRut} placeholder="12.345.678-9" aria-invalid={rutError} />
        {rutError && <p className="text-xs text-destructive">RUT inválido, revisa el dígito verificador.</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Teléfono</Label>
        <PhoneInput name="phone" defaultValue={initialPhone} onValueChange={setPhone} onErrorChange={setPhoneError} />
      </div>

      <div className="flex items-center gap-3">
        <SaveButton disabled={!dirty || nameError || rutError || phoneError}>Guardar cambios</SaveButton>
      </div>
    </form>
  );
}
