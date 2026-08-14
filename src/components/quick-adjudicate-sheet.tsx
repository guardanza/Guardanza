"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/save-button";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";

export function QuickAdjudicateSheet({ action, propertyId }: { action: (formData: FormData) => void; propertyId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Ya tengo al arrendatario
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          <form action={action} className="space-y-4">
            <input type="hidden" name="property_id" value={propertyId} />
            <BottomSheetHeader>
              <BottomSheetTitle>Ya tengo al arrendatario</BottomSheetTitle>
              <BottomSheetDescription>
                Para cuando ya sabes quién va a arrendar y no necesitas evaluar candidatos — te lleva directo a confirmar el
                contrato, sin pasar por la etapa de evaluación.
              </BottomSheetDescription>
            </BottomSheetHeader>

            <div className="space-y-1.5">
              <Label htmlFor="tenant_email">Email del arrendatario</Label>
              <Input id="tenant_email" name="tenant_email" type="email" required placeholder="arrendatario@ejemplo.cl" />
              <p className="text-xs text-muted-foreground">Debe tener una cuenta ya creada en Guardanza.</p>
            </div>

            <BottomSheetFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <SaveButton>Continuar</SaveButton>
            </BottomSheetFooter>
          </form>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
