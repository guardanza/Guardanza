"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";

// Envuelve el formulario de la Sección 1 (datos de la propiedad) — dos
// chequeos antes de dejar pasar el submit, los dos como bottom sheet (no
// modal bloqueante al centro), nunca un error después de un viaje de ida
// y vuelta fallido:
//
// 1. Activar sin los datos obligatorios: valor de arriendo, plazo y
//    garantía son obligatorios para ACTIVAR (no para crear — el Paso 1
//    ya guardó la propiedad como borrador solo con dirección/comuna/
//    arrendador). El campo oculto activate=1 (solo lo manda el botón de
//    Paso 2) es la señal de que se está intentando activar — si falta
//    alguno de los tres, se bloquea acá mismo, antes de llegar al
//    servidor (que igual vuelve a chequear esto, nunca confía en que el
//    cliente ya filtró bien — ver updateProperty).
// 2. Plazo sospechosamente corto (1 a 3 meses) — probablemente alguien
//    puso años sin darse cuenta. "Continuar" deja pasar el guardado tal
//    cual, "Corregir" solo cierra el aviso y devuelve el foco al campo,
//    sin bloquear el guardado si el usuario de verdad quiso ese plazo.
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
  const [missingFields, setMissingFields] = useState<string[] | null>(null);

  function getField(name: string) {
    return formRef.current?.elements.namedItem(name) as HTMLInputElement | null;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (bypassRef.current) {
      bypassRef.current = false;
      return;
    }

    const activating = getField("activate")?.value === "1";
    if (activating) {
      const missing = [
        !getField("expected_rent_amount")?.value.trim() && "Valor de arriendo",
        !getField("expected_term_months")?.value.trim() && "Plazo de arriendo",
        !getField("expected_guarantee_amount")?.value.trim() && "Valor garantía",
      ].filter((v): v is string => !!v);
      if (missing.length > 0) {
        e.preventDefault();
        setMissingFields(missing);
        return;
      }
    }

    const raw = getField("expected_term_months")?.value.trim();
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
    getField("expected_term_months")?.focus();
  }

  return (
    <>
      <form ref={formRef} action={action} onSubmit={handleSubmit} className="space-y-3">
        {children}
      </form>
      <BottomSheet open={missingFields !== null} onOpenChange={(open) => !open && setMissingFields(null)}>
        <BottomSheetContent>
          <BottomSheetHeader>
            <BottomSheetTitle>Faltan datos para activar la propiedad</BottomSheetTitle>
            <BottomSheetDescription>
              Completa estos campos antes de activarla: {missingFields?.join(", ")}.
            </BottomSheetDescription>
          </BottomSheetHeader>
          <BottomSheetFooter>
            <Button type="button" onClick={() => setMissingFields(null)}>
              Entendido
            </Button>
          </BottomSheetFooter>
        </BottomSheetContent>
      </BottomSheet>
      <BottomSheet open={shortTerm !== null} onOpenChange={(open) => !open && setShortTerm(null)}>
        <BottomSheetContent>
          <BottomSheetHeader>
            <BottomSheetTitle>¿Seguro que el plazo está en meses?</BottomSheetTitle>
            <BottomSheetDescription>
              Ingresaste {shortTerm} {shortTerm === 1 ? "mes" : "meses"}.
            </BottomSheetDescription>
          </BottomSheetHeader>
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
