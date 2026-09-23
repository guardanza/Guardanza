import { cn } from "@/lib/utils";
import { CarbonCard } from "@/components/ui/carbon-card";
import { SectionTitle } from "@/components/ui/section-title";

// Caja de información destacada sobre carbón (ej. "Detalles de la
// propiedad", "Garantía", "Dinero custodiado") — título + filas
// rótulo/valor. Rótulo en gris claro, valor en blanco — o en dorado
// claro cuando `amount` marca que es un monto (el detalle que pide la
// imagen de referencia: "los montos en dorado, los demás valores en
// blanco"). Dorado claro sobre este carbón da 9.5:1, de sobra incluso
// para texto chico (ver /estilos).
export function CarbonInfoBox({
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
    <CarbonCard className={cn("p-3.5", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <SectionTitle onCarbon>{title}</SectionTitle>
        {action}
      </div>
      <div className="divide-y divide-white/10">{children}</div>
    </CarbonCard>
  );
}

export function CarbonInfoRow({
  label,
  value,
  amount = false,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  amount?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <span className="text-xs text-white/65">{label}</span>
      <span className={cn("text-sm font-bold tabular-nums", amount ? "text-brand-gold-light" : "text-white", valueClassName)}>{value}</span>
    </div>
  );
}
