"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSheet, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PropertyLifecycleSheetBody } from "@/components/property-lifecycle-action";
import type { ContractBlockingReason } from "@/lib/property-status";

// Menú de acciones por propiedad en la lista (···) — pensado para crecer
// con más acciones más adelante (ej. comparar candidatos), por eso ya es
// un menú y no un botón suelto, aunque hoy solo tenga una entrada. Nada
// de gestos ocultos (swipe): el menú visible es el único camino, para
// que sea descubrible sin tener que enseñarlo.
//
// Reusa PropertyLifecycleSheetBody tal cual — mismos tres mensajes
// (bloqueada por contrato en proceso, por garantía en custodia, o lista
// para confirmar) que ya usa el botón de la ficha de propiedad, sin
// duplicar esa lógica acá. El trigger (···) vive fuera del <Link> de la
// tarjeta (ver properties/page.tsx) — no hace falta parar la propagación
// del click, son hermanos, no está anidado dentro de un elemento
// clickeable.
export function PropertyRowMenu({
  propertyId,
  status,
  blockingReason,
  deactivateAction,
  reactivateAction,
}: {
  propertyId: string;
  status: "activa" | "inactiva";
  blockingReason: ContractBlockingReason | null;
  deactivateAction: (formData: FormData) => void;
  reactivateAction: (formData: FormData) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground"
              aria-label="Más acciones"
              title="Más acciones"
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setSheetOpen(true)}>
            {status === "inactiva" ? "Reactivar" : "Marcar fuera de cartera"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <BottomSheetContent>
          <PropertyLifecycleSheetBody
            propertyId={propertyId}
            status={status}
            blockingReason={blockingReason}
            deactivateAction={deactivateAction}
            reactivateAction={reactivateAction}
            onClose={() => setSheetOpen(false)}
          />
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
