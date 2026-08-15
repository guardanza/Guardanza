"use client";

import { usePathname, useRouter } from "next/navigation";

const selectClass =
  "h-8 shrink-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// Filtro, no pestañas: Activas es el default (implícito, sin ?status= en
// la URL) — Inactivas y Todas son la excepción, quedan explícitas. Nunca
// ofrece "Borrador" como opción acá — los borradores se tratan aparte,
// vía el aviso accionable arriba de la lista (ver /properties/page.tsx),
// no como un cuarto valor de este selector.
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
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      className={selectClass}
      aria-label="Filtrar propiedades por estado"
    >
      <option value="activa">Activas</option>
      <option value="inactiva">Inactivas</option>
      <option value="todas">Todas</option>
    </select>
  );
}
