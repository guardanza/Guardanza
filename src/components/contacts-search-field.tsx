"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

// Búsqueda en vivo de Mis Contactos — antes exigía Enter (o tocar el
// botón de lupa) para buscar, lo que en mobile no siempre es cómodo. Acá
// la página sigue siendo un Server Component (la búsqueda global de las
// dos mejoras de este PR necesita consultar las 3 pestañas en el
// servidor), así que "en vivo" significa: este campo debounce-actualiza
// el ?q= de la URL a medida que se escribe, y Next vuelve a pedir los
// datos del servidor solo con eso — sin manejar los resultados acá
// adentro, a diferencia de CandidateSearchField/LandlordSearchField que
// sí consultan Supabase directo desde el cliente.
//
// Mismo umbral de 2 caracteres que el resto de los buscadores del
// proyecto — por debajo de eso, o al borrar todo, vuelve a mostrarse la
// lista completa de la pestaña activa (sin ?q=).
export function ContactsSearchField({ tab, initialQuery }: { tab: string; initialQuery: string }) {
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
      params.set("tab", tab);
      if (trimmed.length >= 2) params.set("q", trimmed);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router/pathname son estables, re-correr por ellos solo generaría un debounce de más
  }, [query, tab]);

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
        placeholder="Buscar por nombre, email o RUT..."
        className="pl-8"
        autoComplete="off"
      />
    </div>
  );
}
