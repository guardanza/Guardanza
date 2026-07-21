import { cn } from "@/lib/utils";

// Small, deliberately generic status → color mapping shared by contracts,
// guarantees and disputes — they don't share an enum, but the color
// language should read the same everywhere: gray/neutral while waiting,
// gold while pending an action, blue for a proposal on the table, green
// once settled, red once it's a real dispute. Matches the Seguranza design
// system's per-status badge table.
const STATUS_STYLES: Record<string, string> = {
  pendiente: "bg-muted text-primary",
  pendiente_firma_arrendador: "bg-accent text-accent-foreground",
  pendiente_firma_arrendatario: "bg-accent text-accent-foreground",
  pendiente_deposito: "bg-accent text-accent-foreground",
  pagada: "bg-accent text-accent-foreground",
  activo: "bg-success/15 text-success",
  en_custodia: "bg-success/15 text-success",
  propuesta_termino: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  abierta: "bg-destructive/10 text-destructive",
  negociando: "bg-destructive/10 text-destructive",
  en_disputa: "bg-destructive/10 text-destructive",
  en_liquidacion: "bg-destructive/10 text-destructive",
  escalada: "bg-destructive/10 text-destructive",
  rechazada: "bg-destructive/10 text-destructive",
  acordada: "bg-success/15 text-success",
  liquidada: "bg-success/15 text-success",
  finalizado: "bg-success/15 text-success",
  aceptada: "bg-success/15 text-success",
  cancelado: "bg-muted text-muted-foreground",
};

// Only genuinely urgent states pulse — an infinite animation is reserved
// for "this needs attention now", not decoration.
const PULSING_STATUSES = new Set(["en_disputa", "escalada"]);

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLES[status] ?? "bg-secondary text-secondary-foreground",
        className
      )}
    >
      {PULSING_STATUSES.has(status) && <span className="size-1.5 shrink-0 animate-pulse-urgent rounded-full bg-current" />}
      {status.replace(/_/g, " ")}
    </span>
  );
}
