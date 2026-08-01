"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BrokerResult = { id: string; name: string; rut: string | null; org_code: string };

// Buscador abierto de corredoras (Paso 6.5) — a diferencia de todo lo
// demás en esta app, esta búsqueda mira fuera de tu propia órbita, así
// que corre contra search_broker_organizations (SECURITY DEFINER, solo
// nombre/RUT/código, nunca datos de las personas de esa corredora). Client
// component porque necesita debounce + estado de selección; llama al RPC
// directo desde el navegador (grant a authenticated), mismo patrón que el
// browser client ya establecido en el proyecto.
export function BrokerSearchField({ inputName = "broker_organization_id" }: { inputName?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BrokerResult[]>([]);
  const [selected, setSelected] = useState<BrokerResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (selected || query.trim().length < 2) return;
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("search_broker_organizations", { p_prefix: query });
      setResults((data as BrokerResult[]) ?? []);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  // Resultados visibles derivados del estado en vez de limpiados
  // imperativamente en el efecto — evita el flash de resultados viejos
  // sin necesidad de un setState síncrono dentro del efecto.
  const visibleResults = selected || query.trim().length < 2 ? [] : results;

  return (
    <div className="space-y-1.5">
      <Label htmlFor="broker_search">Buscar corredora por nombre o RUT (alternativa al código)</Label>
      <input type="hidden" name={inputName} value={selected?.id ?? ""} />
      {selected ? (
        <div className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm">
          <span className="truncate">
            {selected.name}
            {selected.rut ? ` · ${selected.rut}` : ""}
          </span>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setQuery("");
            }}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Quitar selección"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="broker_search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: Corredora Los Alerces"
            className="pl-8"
            autoComplete="off"
          />
          {visibleResults.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-lg border bg-card py-1 shadow-md">
              {visibleResults.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(r);
                      setResults([]);
                    }}
                    className="flex w-full flex-col items-start px-3 py-1.5 text-left text-sm hover:bg-muted/50"
                  >
                    <span className="font-medium">{r.name}</span>
                    {r.rut && <span className="text-xs text-muted-foreground">{r.rut}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
