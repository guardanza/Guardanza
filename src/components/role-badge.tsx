import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Verde = asignado (mismo lenguaje que activo/confirmado en el resto de la
// app); sin asignar es un estado pendiente, no un error — gris neutro,
// nunca rojo, mismo tono que cancelado/no seleccionado en StatusBadge.
export function RoleBadge({ label, value, emptyText }: { label: string; value: string | null; emptyText: string }) {
  return (
    <Badge variant="secondary" className={cn(value ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
      {label}: {value ?? emptyText}
    </Badge>
  );
}
