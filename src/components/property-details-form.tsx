"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BottomSheet, BottomSheetContent, BottomSheetDescription, BottomSheetFooter, BottomSheetTitle } from "@/components/ui/bottom-sheet";

// Envuelve el formulario de la Sección 1 (datos de la propiedad) para
// interceptar el submit solo cuando el plazo ingresado es sospechosamente
// corto (1 a 3 meses) — probablemente alguien puso años sin darse cuenta.
// Es una confirmación suave (bottom sheet, no modal bloqueante al centro):
// "Continuar" deja pasar el guardado tal cual, "Corregir" solo cierra el
// aviso y devuelve el foco al campo, sin bloquear el guardado si el
// usuario de verdad quiso ese plazo.
export function PropertyDetailsForm({
  action,
  children,
}: {
  action: (formData: FormData) => void;
  children: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const bypassRef = useRef(false);
  const [shortTerm, setShortTerm] = useState<number | null>(null);

  function getTermInput() {
    return formRef.current?.elements.namedItem("expected_term_months") as HTMLInputElement | null;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (bypassRef.current) {
      bypassRef.current = false;
      return;
    }
    const raw = getTermInput()?.value.trim();
    const months = raw ? Number(raw) : null;
    if (months && months > 0 && months < 4) {
      e.preventDefault();
      setShortTerm(months);
    }
  }

  function handleContinue() {
    setShortTerm(null);
    bypassRef.current = true;
    formRef.current?.requestSubmit();
  }

  function handleFix() {
    setShortTerm(null);
    getTermInput()?.focus();
  }

  return (
    <>
      <form ref={formRef} action={action} onSubmit={handleSubmit} className="space-y-3">
        {children}
      </form>
      <BottomSheet open={shortTerm !== null} onOpenChange={(open) => !open && setShortTerm(null)}>
        <BottomSheetContent>
          <BottomSheetTitle>¿Seguro que el plazo está en meses?</BottomSheetTitle>
          <BottomSheetDescription>
            Ingresaste {shortTerm} {shortTerm === 1 ? "mes" : "meses"}.
          </BottomSheetDescription>
          <BottomSheetFooter>
            <Button type="button" variant="outline" onClick={handleFix}>
              Corregir
            </Button>
            <Button type="button" onClick={handleContinue}>
              Continuar
            </Button>
          </BottomSheetFooter>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
