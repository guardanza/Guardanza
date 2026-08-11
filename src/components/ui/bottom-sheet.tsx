"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"

// Variante de Dialog anclada abajo de la pantalla en vez de al centro —
// para confirmaciones suaves (ej. plazo de arriendo sospechosamente
// corto) donde una ventana modal centrada se siente más bloqueante de lo
// que en realidad es: solo una pregunta de "¿estás seguro?" con dos
// salidas simples.
function BottomSheet({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="bottom-sheet" {...props} />
}

function BottomSheetPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="bottom-sheet-portal" {...props} />
}

function BottomSheetOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="bottom-sheet-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/20 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function BottomSheetContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <BottomSheetPortal>
      <BottomSheetOverlay />
      <DialogPrimitive.Popup
        data-slot="bottom-sheet-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md space-y-3 rounded-t-2xl bg-popover p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none duration-150 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </BottomSheetPortal>
  )
}

// Agrupa título + descripción con su propio respiro (space-y-1.5) —
// separado del space-y-3 más generoso entre BottomSheetContent y
// BottomSheetFooter. Antes el título y la descripción quedaban pegados
// cada vez que el contenido vivía dentro de un <form> (el space-y-3 de
// BottomSheetContent solo separa a sus HIJOS DIRECTOS; un <form> que
// envuelve título+descripción+footer rompe ese espaciado por completo).
// Envolver título+descripción acá adentro hace que el respiro sea
// intrínseco al componente, sin depender de dónde caiga el <form>.
function BottomSheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="bottom-sheet-header" className={cn("space-y-1.5", className)} {...props} />
}

function BottomSheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="bottom-sheet-title"
      className={cn("font-heading text-base leading-none font-medium", className)}
      {...props}
    />
  )
}

function BottomSheetDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="bottom-sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function BottomSheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bottom-sheet-footer"
      className={cn("flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

export {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
}
