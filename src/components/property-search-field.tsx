"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

// Búsqueda en vivo del catálogo de propiedades — mismo patrón que
// ContactsSearchField: la página sigue siendo un Server Component (la
// búsqueda cruza varias tablas con las policies RLS normales), así que
// "en vivo" significa que este campo debounce-actualiza el ?q= de la URL
// a medida que se escribe, sin depender de Enter (crítico en mobile).
// Mismo umbral de 2 caracteres que el resto de los buscadores del
// proyecto — por debajo de eso, o al borrar todo, vuelve a mostrarse el
// catálogo completo.
//
// `status` es el filtro activo (ver PropertyStatusFilter) — se
// re-incluye en cada actualización para no perderlo mientras se escribe
// (este campo arma el querystring desde cero en cada tecla).
export function PropertySearchField({ initialQuery, status }: { initialQuery: string; status: "activa" | "inactiva" | "todas" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = query.trim();
      const params = new URLSearchParams();
      if (trimmed.length >= 2) params.set("q", trimmed);
      if (status !== "activa") params.set("status", status);
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router/pathname son estables, re-correr por ellos solo generaría un debounce de más
  }, [query, status]);

  return (
    <div className="relative">
      {isPending ? (
        <Loader2 className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : (
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por dirección, arrendador o arrendatario..."
        className="pl-8"
        autoComplete="off"
      />
    </div>
  );
}
