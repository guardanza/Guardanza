import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";

// Caja de información blanca simple — título con el subrayado dorado
// estándar + filas rótulo/valor, para lo que no es "tarjeta destacada"
// (eso es CarbonInfoBox: Detalles de la propiedad, Garantía…). Ej.
// "Participantes" — son nombres, no montos, no necesita el fondo
// carbón para destacar.
export function InfoBox({
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
    <Card className={cn("p-3.5", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <SectionTitle>{title}</SectionTitle>
        {action}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </Card>
  );
}

export function InfoRow({
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
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-bold tabular-nums text-foreground", valueClassName)}>{value}</span>
    </div>
  );
}
