"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isValidEmail } from "@/lib/email";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type ContactResult = { id: string; full_name: string; email: string; rut: string | null; status: "pendiente" | "confirmado" };

// Buscador de candidatos (Tanda D Fase 1) — busca dentro de TU propia
// libreta (contacts, RLS ya te limita a tu organización), filtrado a
// contact_role='arrendatario'. A diferencia de LandlordSearchField, acá
// SÍ se puede elegir un contacto pendiente (todavía sin cuenta): un
// candidato en evaluación no necesita tener user_id resuelto todavía,
// solo lo necesita para poder ganar (eso se valida más adelante, en el
// paso sensible de elegir ganador). Tampoco hace falta resolver
// organización — property_candidates referencia contact_id directo.
//
// Sin <form> propio a propósito, mismo patrón que LandlordSearchField:
// vive dentro del <form action={addPropertyCandidate}> de la página, solo
// aporta el input oculto name="contact_id". Se auto-envía al elegir un
// resultado, sin botón "Agregar" aparte.
//
// inviteAction + propertyId (opcional): cuando la búsqueda no encuentra
// a nadie y lo escrito parece un email, ofrece invitarlo directo como
// candidato — mismo mecanismo que ya usa Mis Contactos (quickInviteContact),
// no uno nuevo (ver inviteCandidateByEmail). El rol nunca se pregunta acá:
// por venir del buscador de candidatos, siempre es arrendatario, así que
// el botón lo dice explícito ("Invitar como arrendatario") en vez de
// dejarlo implícito.
//
// El botón de invitar llama a la acción directo (sin <form> propio) en
// vez de armar un segundo formulario — este componente ya vive DENTRO
// del <form action={addPropertyCandidate}> de la página, y HTML no
// admite un <form> anidado dentro de otro (rompía la hidratación:
// "cannot be a descendant of <form>").
export function CandidateSearchField({
  inputName = "contact_id",
  propertyId,
  inviteAction,
}: {
  inputName?: string;
  propertyId?: string;
  inviteAction?: (formData: FormData) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactResult[]>([]);
  const [selected, setSelected] = useState<ContactResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (selected || query.trim().length < 2) return;
    const prefix = query.trim().replace(/[%_,()]/g, "");
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("contacts")
        .select("id, full_name, email, rut, status")
        .eq("contact_role", "arrendatario")
        .or(`full_name.ilike.${prefix}%,email.ilike.${prefix}%,rut.ilike.${prefix}%`)
        .order("full_name")
        .limit(10);
      setResults((data as ContactResult[]) ?? []);
      setSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  // searching se maneja desde el evento de escritura (no desde el efecto
  // de arriba) para no llamar setState de forma síncrona dentro de un
  // efecto — ahí solo se apaga, al terminar la búsqueda.
  function handleQueryChange(value: string) {
    setQuery(value);
    setSearching(value.trim().length >= 2);
  }

  const visibleResults = selected || query.trim().length < 2 ? [] : results;
  const trimmedQuery = query.trim();
  const noResults = !selected && !searching && trimmedQuery.length >= 2 && results.length === 0;
  const canInvite = noResults && !!propertyId && !!inviteAction && isValidEmail(trimmedQuery);

  function handleInvite() {
    if (!propertyId || !inviteAction || inviting) return;
    setInviting(true);
    const formData = new FormData();
    formData.set("property_id", propertyId);
    formData.set("email", trimmedQuery);
    inviteAction(formData);
  }

  // Mismo motivo que en LandlordSearchField/BrokerSearchField: el efecto
  // corre después de que el input oculto ya refleja el valor elegido,
  // evitando enviar el formulario vacío.
  useEffect(() => {
    if (selected) hiddenInputRef.current?.form?.requestSubmit();
  }, [selected]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor="candidate_search">Agregar candidato por nombre, email o RUT</Label>
      <input ref={hiddenInputRef} type="hidden" name={inputName} value={selected?.id ?? ""} />
      {selected ? (
        <div className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm">
          <span className="truncate">{selected.full_name}</span>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setQuery("");
              setSearching(false);
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
            id="candidate_search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Ej: Ana Arrendataria"
            className="pl-8"
            autoComplete="off"
          />
          {visibleResults.length > 0 && (
            // Sin position:absolute a propósito — ver el mismo comentario
            // en LandlordSearchField/BrokerSearchField: dentro de una Card
            // (overflow-hidden) un dropdown flotante se corta contra el
            // borde; en flujo normal la Card simplemente crece.
            <ul className="relative z-10 mt-1 w-full rounded-lg border bg-card py-1 shadow-md">
              {visibleResults.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(c)}
                    className="flex w-full flex-col items-start px-3 py-1.5 text-left text-sm hover:bg-muted/50"
                  >
                    <span className="font-medium">{c.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {[c.email, c.rut].filter(Boolean).join(" · ")}
                      {c.status === "pendiente" && " · pendiente de confirmar"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {canInvite && (
            <div className="mt-2 space-y-1.5 rounded-lg border border-brand-gold/40 bg-brand-gold/5 p-3">
              <p className="text-xs font-medium text-primary">
                <span className="break-all">{trimmedQuery}</span> no tiene cuenta en Guardanza.
              </p>
              <Button type="button" size="sm" disabled={inviting} onClick={handleInvite}>
                {inviting ? "Invitando…" : "Invitar como arrendatario"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
