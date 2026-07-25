"use client";

import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveButton } from "@/components/save-button";
import { validateRut, formatRut } from "@/lib/rut";

const NAME_PATTERN = /^[A-Za-zÀ-ÿ\s]{1,50}$/;

export function ProfileForm({
  action,
  provider,
  initialFullName,
  initialRut,
  initialPhone,
  rutHighlighted,
  next,
}: {
  action: (formData: FormData) => void;
  provider: "google" | "email";
  initialFullName: string;
  initialRut: string;
  initialPhone: string;
  rutHighlighted?: boolean;
  next?: string;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [rut, setRut] = useState(initialRut);
  const [phone, setPhone] = useState(initialPhone);

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
        <Label htmlFor="rut">RUT</Label>
        <Input
          id="rut"
          name="rut"
          value={rut}
          onChange={(e) => setRut(formatRut(e.target.value))}
          placeholder="12.345.678-9"
          aria-invalid={rutError}
        />
        {rutError && <p className="text-xs text-destructive">RUT inválido, revisa el dígito verificador.</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Teléfono</Label>
        <Input id="phone" name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+56 9 1234 5678" />
      </div>

      <div className="flex items-center gap-3">
        <SaveButton disabled={!dirty || nameError || rutError}>Guardar cambios</SaveButton>
      </div>
    </form>
  );
}
