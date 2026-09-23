import { cn } from "@/lib/utils";

// Estándar único de título de sección — un h2 dentro de una pantalla
// (ej. "Detalles de la propiedad", "Candidatos para arrendar",
// "Contratos por estado"). Título en negrita casi negro (o blanco sobre
// carbón), subtítulo gris opcional debajo, y un subrayado dorado corto
// — el mismo tratamiento en toda la app, documentado en /estilos.
//
// Jerarquía que respeta: título de página (h1, text-xl/2xl) > título de
// sección (acá, text-lg) > nombre del ítem (text-sm bold) > texto
// secundario (text-xs).
//
// `onCarbon` es la única variante — sobre carbón el subrayado pasa a
// dorado claro (más contraste ahí) y el texto a blanco; sobre blanco el
// subrayado es el dorado base y el texto hereda el casi-negro de
// --foreground.
export function SectionTitle({
  children,
  subtitle,
  onCarbon = false,
  className,
}: {
  children: React.ReactNode;
  subtitle?: React.ReactNode;
  onCarbon?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className={cn("text-lg font-bold", onCarbon ? "text-white" : "text-foreground")}>{children}</h2>
      <span className={cn("mt-1.5 block h-[3px] w-9 rounded-full", onCarbon ? "bg-brand-gold-light" : "bg-brand-gold")} />
      {subtitle && <p className={cn("mt-1.5 text-xs", onCarbon ? "text-white/65" : "text-muted-foreground")}>{subtitle}</p>}
    </div>
  );
}
