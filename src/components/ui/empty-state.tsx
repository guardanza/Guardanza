import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

// Estado vacío sobre tarjeta blanca (reemplaza a GreenEmptyState del
// sistema verde anterior) — el sistema nuevo no tiene fondo de color
// para listas de contenido, solo la tarjeta blanca de siempre con un
// ícono/mensaje neutro.
export function EmptyState({
  icon: Icon,
  message,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  message: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col items-center gap-3 px-4 py-12 text-center", className)}>
      {Icon && <Icon className="size-8 text-muted-foreground" strokeWidth={1.5} />}
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      {action}
    </Card>
  );
}
