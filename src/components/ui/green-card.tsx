import { cn } from "@/lib/utils";

// Primitivo base del sistema de tarjetas verdes (unificado en toda la
// app — ver /estilos, sección "Tarjetas"). Nace en Contactos/Candidatos
// (candidate-card.tsx, contact-card.tsx) con la paleta --brand-green-card
// ya verificada por contraste real (blanco puro es el techo matemático
// sobre este verde exacto, 3.94:1 — ver el comentario largo en
// candidate-card.tsx para el detalle). Vive acá para que cualquier
// tarjeta nueva (propiedad, cajas de información…) parta del mismo
// origen en vez de reescribir el fondo/borde/sombra a mano cada vez.
//
// `deep` es el estado "destacado" (ej. candidato con documentos
// completos) — mismo verde oscuro que ya usaba el círculo de iniciales
// (--brand-green-card-deep), reusado a propósito.
export function GreenCard({
  className,
  deep = false,
  ...props
}: React.ComponentProps<"div"> & { deep?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border text-brand-green-card-foreground",
        deep
          ? "border-brand-green-card-deep-border bg-brand-green-card-deep shadow-[0_4px_18px_rgba(20,67,47,0.4)]"
          : "border-brand-green-card-border bg-brand-green-card shadow-[0_3px_12px_rgba(20,67,47,0.18)]",
        className
      )}
      {...props}
    />
  );
}

// Los tres tonos de chip ya verificados por contraste sobre este verde
// (ver candidate-card.tsx / contact-card.tsx, donde nacieron):
// - "solid": blanco casi pleno + texto verde oscuro — el chip principal,
//   el que más se lee (5.78:1).
// - "translucent": blanco 35% + el mismo texto oscuro — secundario, pero
//   NUNCA con texto claro sobre translúcido (esa combinación, la que
//   traía el mockup de referencia, medía 2.55:1 y no se usa acá).
// - "deep": el verde oscuro sólido de --brand-green-card-deep + texto
//   blanco — para una etiqueta persistente (ej. "Arrendador"), no un
//   estado que cambia.
const GREEN_CHIP_TONES = {
  solid: "bg-white/90 text-[#1f6b45]",
  translucent: "bg-white/35 text-brand-green-card-deep-border",
  deep: "bg-brand-green-card-deep text-white",
} as const;

export function GreenChip({
  tone = "solid",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: keyof typeof GREEN_CHIP_TONES }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        GREEN_CHIP_TONES[tone],
        className
      )}
      {...props}
    />
  );
}

// Estado vacío sobre el sistema verde — mismo criterio que el resto:
// texto en blanco pleno (nunca atenuado), el ícono sí puede ir más
// suave (blanco 70%) porque es puramente decorativo y el mensaje de
// texto ya dice lo mismo — mismo razonamiento que el ícono de
// "Descartar" en candidate-card.tsx (la forma/el texto llevan el
// significado, no hace falta que el color del ícono llegue a AA).
export function GreenEmptyState({
  icon: Icon,
  message,
  className,
}: {
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  message: string;
  className?: string;
}) {
  return (
    <GreenCard className={cn("flex flex-col items-center gap-2 px-4 py-12 text-center", className)}>
      {Icon && <Icon className="size-8 text-white/70" strokeWidth={1.5} />}
      <p className="text-sm text-white">{message}</p>
    </GreenCard>
  );
}
