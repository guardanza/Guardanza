import { cn } from "@/lib/utils";
import { GreenCard } from "@/components/ui/green-card";
import { SectionTitle } from "@/components/ui/section-title";

// Caja de información sobre el sistema verde (ej. "Detalles de la
// propiedad", "Participantes", "Garantía") — título + filas
// rótulo/valor. Mismo criterio de contraste que el resto del sistema:
// tanto el rótulo como el valor van en blanco pleno (el techo real de
// contraste sobre este verde, 3.94:1 — ver candidate-card.tsx); la
// jerarquía entre ambos se resuelve con peso (rótulo regular, valor
// bold), nunca atenuando el color de uno de los dos. El título usa
// SectionTitle (ver ui/section-title.tsx) — el estándar único de la
// app, no un tratamiento aparte para las cajas verdes.
export function GreenInfoBox({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <GreenCard className={cn("p-3.5", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <SectionTitle onGreen>{title}</SectionTitle>
        {action}
      </div>
      <div className="divide-y divide-white/12">{children}</div>
    </GreenCard>
  );
}

export function GreenInfoRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <span className="text-xs text-white">{label}</span>
      <span className={cn("text-sm font-bold tabular-nums text-white", valueClassName)}>{value}</span>
    </div>
  );
}
