"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { formatRut } from "@/lib/rut";

// Autoformato de RUT (puntos de miles + guión, ej. 12.345.678-9) como
// comportamiento GLOBAL del campo — un solo componente en vez de repetir
// el mismo onChange en cada formulario que pide RUT (perfil, invitación,
// alta de contacto, registro, elegir rol). Sigue siendo un <input> común
// para el form que lo contiene: el valor formateado se manda tal cual
// bajo `name`, no hace falta que quien use este componente sepa nada de
// formatRut.
export function RutInput({
  id = "rut",
  name = "rut",
  defaultValue = "",
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "defaultValue" | "value" | "onChange"> & {
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <Input
      {...props}
      id={id}
      name={name}
      value={value}
      onChange={(e) => {
        const formatted = formatRut(e.target.value);
        setValue(formatted);
        onValueChange?.(formatted);
      }}
    />
  );
}
