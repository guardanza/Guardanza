"use client";

// Piezas interactivas de /estilos — client porque leen valores
// computados de verdad (getComputedStyle) en vez de tener el hex o el
// tamaño en px escritos a mano acá. Si un token cambia en globals.css,
// lo que se ve en esta página cambia solo, sin tocar este archivo — es
// el punto central de /estilos: mostrar la fuente real, no una copia
// que se puede desincronizar.

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";

function rgbToHex(rgb: string): string {
  const m = rgb.match(/[\d.]+/g);
  if (!m || m.length < 3) return rgb;
  const [r, g, b] = m.map(Number);
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

// Bloque de color: el propio <div> lleva la clase de Tailwind del token
// (bg-primary, bg-brand-gold, etc.), y recién después de montado se lee
// su color YA RESUELTO por el navegador — así el hex que se muestra es
// siempre el valor real vigente, nunca uno tipeado a mano.
export function TokenSwatch({
  name,
  cssVar,
  swatchClassName,
  usage,
  sample = "Aa",
}: {
  name: string;
  cssVar: string;
  swatchClassName: string;
  usage: string;
  sample?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [bg, setBg] = useState<string | null>(null);
  const [fg, setFg] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const cs = getComputedStyle(ref.current);
    setBg(rgbToHex(cs.backgroundColor));
    setFg(rgbToHex(cs.color));
  }, []);

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-3">
      <div
        ref={ref}
        className={cn("flex size-12 shrink-0 items-center justify-center rounded-lg border border-black/10 text-sm font-bold", swatchClassName)}
      >
        {sample}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          {cssVar} · {bg ?? "…"}
          {fg && fg !== bg ? ` / ${fg}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">{usage}</p>
      </div>
    </div>
  );
}

// Misma idea para tipografía: el <p> de muestra lleva la clase real
// (text-sm, text-lg…) y se mide su font-size ya calculado.
export function TypeSample({
  twClass,
  note,
  sample,
}: {
  twClass: string;
  note: string;
  sample: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [px, setPx] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    setPx(`${parseFloat(getComputedStyle(ref.current).fontSize)}px`);
  }, []);

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border py-3 last:border-0">
      <p ref={ref} className={cn(twClass, "min-w-0 truncate text-foreground")}>
        {sample}
      </p>
      <div className="min-w-0 max-w-full text-right sm:max-w-[55%]">
        <code className="text-xs text-muted-foreground">{twClass}</code>
        <p className="text-xs tabular-nums text-muted-foreground">
          {px ?? "…"} · {note}
        </p>
      </div>
    </div>
  );
}

// Bottom sheet real (mismo componente que usan Adjudicar/Descartar/
// Cancelar contrato), con contenido de ejemplo — para no repetir un
// modal falso hecho a mano cuando el de verdad ya existe.
export function BottomSheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Ver ejemplo
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          <BottomSheetHeader>
            <BottomSheetTitle>¿Confirmas esta acción?</BottomSheetTitle>
            <BottomSheetDescription>
              Texto de ejemplo — así se ve un BottomSheet real (mismo componente que usan Adjudicar, Descartar candidato(a) y Cancelar contrato).
            </BottomSheetDescription>
          </BottomSheetHeader>
          <BottomSheetFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => setOpen(false)}>
              Confirmar
            </Button>
          </BottomSheetFooter>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
