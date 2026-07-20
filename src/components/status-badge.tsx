import { cn } from "@/lib/utils";

// Small, deliberately generic status → color mapping shared by contracts,
// guarantees and disputes — they don't share an enum, but the color
// language (neutral draft, blue in-progress, green settled, red disputed)
// should read the same everywhere in the app.
const STATUS_STYLES: Record<string, string> = {
  borrador: "bg-muted text-muted-foreground",
  pendiente: "bg-muted text-muted-foreground",
  pendiente_firma: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  activo: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  pagada: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  en_custodia: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  abierta: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  negociando: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  en_disputa: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  en_liquidacion: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  acordada: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  liquidada: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  finalizado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  aceptada: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  escalada: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  rechazada: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLES[status] ?? "bg-secondary text-secondary-foreground",
        className
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
