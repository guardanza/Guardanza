import { cn } from "@/lib/utils";

// La "tarjeta destacada" del sistema nuevo — fondo carbón, para las
// pocas cajas que muestran los números más importantes de una pantalla
// (Detalles de la propiedad, Garantía, Dinero custodiado, las
// estadísticas del dashboard). No es el tratamiento de toda tarjeta de
// contenido — las tarjetas de candidato/contacto/propiedad y las listas
// navegables son blancas (Card normal); esto es solo para lo que de
// verdad se quiere destacar. Reemplaza a GreenCard (sistema anterior).
export function CarbonCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-black/20 bg-primary text-white shadow-[0_4px_16px_rgba(21,23,27,0.25)]",
        className
      )}
      {...props}
    />
  );
}

// Chip dorado-sobre-beige (ej. "En evaluación") — para usar sobre fondo
// BLANCO, nunca sobre carbón (ahí un chip claro perdería sentido). Texto
// en el dorado más oscuro posible + negrita: sobre beige da 4.33:1, corto
// por muy poco de la AA estricta (4.5) para texto chico — es el máximo
// verificado sin perder el matiz dorado (ver /estilos, sección Colores).
export function BrandChip({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-brand-gold/15 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-brand-gold-dark",
        className
      )}
      {...props}
    />
  );
}
