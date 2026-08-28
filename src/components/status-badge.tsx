import { cn } from "@/lib/utils";

// Small, deliberately generic status → color mapping shared by contracts,
// guarantees and disputes — they don't share an enum, but the color
// language should read the same everywhere: gray/neutral while waiting,
// gold while pending an action, blue for a proposal on the table, green
// once settled, red once it's a real dispute. Matches the Seguranza design
// system's per-status badge table.
const STATUS_STYLES: Record<string, string> = {
  // text-foreground, no text-primary — "pendiente" es justo el caso que
  // este archivo documenta como "gray/neutral while waiting". Antes
  // funcionaba por accidente: --primary era un verde tan oscuro
  // (#0f3d2e) que se leía casi como un gris oscuro. Con el verde de marca
  // renovado (#1f7a4d, con más presencia) ese mismo texto empezaba a
  // leerse como un chip verde de "confirmado" — justo lo que la regla de
  // este proyecto prohíbe para un estado pendiente.
  pendiente: "bg-muted text-foreground",
  pendiente_firma_arrendador: "bg-accent text-accent-foreground",
  pendiente_firma_arrendatario: "bg-accent text-accent-foreground",
  pendiente_deposito: "bg-accent text-accent-foreground",
  pagada: "bg-accent text-accent-foreground",
  expirada: "bg-accent text-accent-foreground",
  rol_distinto: "bg-destructive/10 text-destructive",
  activo: "bg-success/15 text-success",
  en_custodia: "bg-success/15 text-success",
  confirmado: "bg-success/15 text-success",
  propuesta_termino: "bg-info text-info-foreground",
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
  aprobada: "bg-success/15 text-success",
  cancelado: "bg-muted text-muted-foreground",
  en_evaluacion: "bg-accent text-accent-foreground",
  seleccionado: "bg-success/15 text-success",
  no_seleccionado: "bg-muted text-muted-foreground",
};

// Only genuinely urgent states pulse — an infinite animation is reserved
// for "this needs attention now", not decoration.
const PULSING_STATUSES = new Set(["en_disputa", "escalada"]);

// `label` sobrescribe el texto sin tocar el color/mapping — ej.
// "seleccionado" (nombre interno del estado) se lee "Adjudicado" en la
// ficha de propiedad, mismo verde de siempre. `icon` es opcional, mismo
// espíritu — un ícono de apoyo (ej. el escudo de "En Guardanza" en
// Contactos) sin tocar color ni texto.
export function StatusBadge({
  status,
  label,
  icon: Icon,
  className,
}: {
  status: string;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLES[status] ?? "bg-secondary text-secondary-foreground",
        className
      )}
    >
      {PULSING_STATUSES.has(status) && <span className="size-1.5 shrink-0 animate-pulse-urgent rounded-full bg-current" />}
      {Icon && <Icon className="size-3 shrink-0" />}
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}
