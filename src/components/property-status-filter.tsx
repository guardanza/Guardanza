"use client";

import { usePathname, useRouter } from "next/navigation";
import { ListFilter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OPTIONS = [
  { value: "activa", label: "Activas" },
  { value: "inactiva", label: "Inactivas" },
  { value: "todas", label: "Todas" },
];

const LABELS: Record<string, string> = Object.fromEntries(OPTIONS.map((o) => [o.value, o.label]));

// Filtro, no pestañas: Activas es el default (implícito, sin ?status= en
// la URL) — Inactivas y Todas son la excepción, quedan explícitas. Nunca
// ofrece "Borrador" como opción acá — los borradores se tratan aparte,
// vía el aviso accionable arriba de la lista (ver /properties/page.tsx),
// no como un cuarto valor de este selector.
//
// Mismo Select con estilo del sistema (ya usado en phone-input.tsx y
// role-change-request-dialog.tsx) en vez de un <select> nativo a secas —
// mismo comportamiento, mejor presentación (ícono, popup animado, marca
// de selección).
//
// Recibe `query` (el ?q= actual) para no perderlo al cambiar de filtro —
// mismo problema que resuelve PropertySearchField en la otra dirección
// (recibe `status` para no perder el filtro al escribir). Cada control
// conoce el valor del otro y lo re-incluye al armar la URL.
export function PropertyStatusFilter({ status, query }: { status: "activa" | "inactiva" | "todas"; query: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(value: string) {
    const params = new URLSearchParams();
    if (query.trim().length >= 2) params.set("q", query);
    if (value !== "activa") params.set("status", value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <Select value={status} onValueChange={(v) => handleChange(v as string)}>
      <SelectTrigger aria-label="Filtrar propiedades por estado" className="gap-2">
        <ListFilter className="size-3.5 text-muted-foreground" />
        <SelectValue>{(value: string) => LABELS[value] ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
