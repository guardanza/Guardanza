"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { COUNTRIES, DEFAULT_COUNTRY_ISO2, findCountry, flagEmoji } from "@/lib/countries";

// Separa un teléfono guardado ("+56 9 1234 5678") en país + número local,
// para poder editarlo con el selector. Prueba los códigos de llamada de
// más largos a más cortos (algunos países comparten prefijo, ej. +1) y
// cae a Chile con el valor crudo como número local si no reconoce nada
// -- nunca se pierde el dato, en el peor caso queda todo en el campo de
// número para que la persona lo revise.
function parseInitialPhone(defaultValue: string): { iso2: string; localNumber: string } {
  const digits = defaultValue.trim().replace(/[^\d+]/g, "");
  if (!digits) return { iso2: DEFAULT_COUNTRY_ISO2, localNumber: "" };

  const byDialLengthDesc = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of byDialLengthDesc) {
    if (digits.startsWith(c.dial)) {
      return { iso2: c.iso2, localNumber: digits.slice(c.dial.length).replace(/\D/g, "") };
    }
  }
  return { iso2: DEFAULT_COUNTRY_ISO2, localNumber: digits.replace(/\D/g, "") };
}

// Selector de país (prefijo internacional + bandera, computada del ISO2
// — ver flagEmoji) más el número local. Se combinan en un solo <input
// type="hidden"> con el name pedido, así que para el <form> que lo
// contiene esto sigue siendo un campo de teléfono común y corriente.
// Chile validado a 9 dígitos exactos porque es el caso explícitamente
// pedido; el resto de los países solo se sanean a dígitos, sin un largo
// fijo — no hay una tabla confiable de longitudes por país acá.
export function PhoneInput({
  name = "phone",
  defaultValue = "",
  onValueChange,
  onErrorChange,
}: {
  name?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onErrorChange?: (hasError: boolean) => void;
}) {
  const initial = useMemo(() => parseInitialPhone(defaultValue), [defaultValue]);
  const [iso2, setIso2] = useState(initial.iso2);
  const [localNumber, setLocalNumber] = useState(initial.localNumber);
  const country = findCountry(iso2);

  const isChile = iso2 === "CL";
  const chileError = isChile && localNumber.length > 0 && localNumber.length !== 9;
  const combined = localNumber ? `${country.dial} ${localNumber}` : "";

  // No dispara en el montaje inicial -- el valor recién parseado desde
  // defaultValue casi nunca coincide byte a byte con el string guardado
  // (distinto formato de espacios), y si avisara igual el "dirty" del
  // form quedaría prendido desde el arranque sin que la persona haya
  // tocado nada.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onValueChange?.(combined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onValueChange es un setState estable en todos los usos actuales; incluirlo re-dispararía el effect en cada render del padre
  }, [combined]);

  useEffect(() => {
    onErrorChange?.(chileError);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- misma razón que el effect anterior
  }, [chileError]);

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Select value={iso2} onValueChange={(v) => setIso2(v as string)}>
          <SelectTrigger className="shrink-0 gap-1.5">
            <span aria-hidden>{flagEmoji(country.iso2)}</span>
            <span>{country.dial}</span>
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {COUNTRIES.map((c) => (
              <SelectItem key={c.iso2} value={c.iso2}>
                <span aria-hidden>{flagEmoji(c.iso2)}</span>
                <span>{c.name}</span>
                <span className="text-muted-foreground">{c.dial}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={localNumber}
          onChange={(e) => setLocalNumber(e.target.value.replace(/\D/g, "").slice(0, 15))}
          placeholder={isChile ? "9 1234 5678" : "Número"}
          inputMode="numeric"
          aria-invalid={chileError}
          className="flex-1"
        />
      </div>
      <input type="hidden" name={name} value={combined} />
      {chileError && <p className="text-xs text-destructive">El número en Chile debe tener 9 dígitos.</p>}
    </div>
  );
}
