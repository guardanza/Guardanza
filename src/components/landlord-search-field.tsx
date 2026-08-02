"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ContactResult = { id: string; full_name: string; email: string; rut: string | null; status: "pendiente" | "confirmado" };
type Selected = { organizationId: string; fullName: string };

// Buscador de copropietarios (Paso 6.7) — a diferencia del buscador de
// corredoras (abierto a toda la plataforma), este busca dentro de TU
// propia libreta (contacts, RLS ya te limita a tu organización) — un
// copropietario es un arrendador más, se agrega desde ahí, nunca desde
// afuera. Dos pasos: 1) buscar el contacto, 2) resolver su organización
// vía resolve_contact_organization — solo contactos confirmados se
// pueden resolver (Opción A: un pendiente aparece pero deshabilitado,
// todavía no tiene cuenta que resolver).
//
// Sin <form> propio a propósito — vive dentro del <form action=
// {addPropertyLandlord}> de la página, mismo lugar que ocupaba el
// <select> viejo; solo aporta el input oculto name="organization_id" que
// esa acción ya sabe leer.
export function LandlordSearchField({ inputName = "organization_id" }: { inputName?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactResult[]>([]);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (selected || query.trim().length < 2) return;
    const prefix = query.trim().replace(/[%_,()]/g, "");
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("contacts")
        .select("id, full_name, email, rut, status")
        .eq("contact_role", "arrendador")
        .or(`full_name.ilike.${prefix}%,email.ilike.${prefix}%,rut.ilike.${prefix}%`)
        .order("full_name")
        .limit(10);
      setResults((data as ContactResult[]) ?? []);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  const visibleResults = selected || query.trim().length < 2 ? [] : results;

  async function selectContact(c: ContactResult) {
    setResolveError(null);
    setResolving(c.id);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("resolve_contact_organization", { p_contact_id: c.id }).maybeSingle<{ id: string }>();
    setResolving(null);
    if (error || !data) {
      setResolveError("No se pudo vincular a esta persona — probá buscarla de nuevo.");
      return;
    }
    setSelected({ organizationId: data.id, fullName: c.full_name });
    setResults([]);
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="landlord_search">Agregar copropietario por nombre, email o RUT</Label>
      <input type="hidden" name={inputName} value={selected?.organizationId ?? ""} />
      {resolveError && <p className="text-xs text-destructive">{resolveError}</p>}
      {selected ? (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center justify-between rounded-lg border px-3 py-1.5 text-sm">
            <span className="truncate">{selected.fullName}</span>
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
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="landlord_search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: Ana Arrendadora"
            className="pl-8"
            autoComplete="off"
          />
          {visibleResults.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-lg border bg-card py-1 shadow-md">
              {visibleResults.map((c) => (
                <li key={c.id}>
                  {c.status === "confirmado" ? (
                    <button
                      type="button"
                      disabled={resolving === c.id}
                      onClick={() => selectContact(c)}
                      className="flex w-full flex-col items-start px-3 py-1.5 text-left text-sm hover:bg-muted/50 disabled:opacity-60"
                    >
                      <span className="font-medium">{c.full_name}</span>
                      <span className="text-xs text-muted-foreground">{resolving === c.id ? "Vinculando…" : [c.email, c.rut].filter(Boolean).join(" · ")}</span>
                    </button>
                  ) : (
                    <div className="flex w-full flex-col items-start px-3 py-1.5 text-left text-sm opacity-60">
                      <span className="font-medium">{c.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        Pendiente de confirmar — se podrá agregar una vez que acepte la invitación.
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
