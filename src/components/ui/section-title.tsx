import { cn } from "@/lib/utils";

// Estándar único de título de sección — un h2 dentro de una pantalla
// (ej. "Detalles de la propiedad", "Candidatos para arrendar",
// "Contratos por estado"). Antes convivían dos tratamientos distintos
// en la misma vista (mayúsculas chico en las cajas verdes vs. sentence
// case más grande en las tarjetas blancas) — este componente es la
// única fuente, documentada en /estilos.
//
// Jerarquía que respeta (ver /estilos, sección "Título de sección"):
// título de página (h1, text-xl/2xl) > título de sección (acá,
// text-lg) > nombre del ítem (ej. nombre de candidato, text-sm) >
// texto secundario (text-xs). Bold ≥18px califica como "texto grande"
// para WCAG (umbral relajado de contraste 3:1) — por eso, sobre el
// sistema verde, blanco pleno (3.94:1, el techo de este verde — ver
// candidate-card.tsx) sí alcanza AA acá, a diferencia de un texto más
// chico.
//
// `onGreen` es la única variante: sobre blanco no hace falta fijar
// color — h1-h6 ya heredan font-heading font-bold text-brand-forest
// del layer base (globals.css) — pero se fija igual acá para no
// depender de que nadie recuerde esa regla.
export function SectionTitle({
  children,
  onGreen = false,
  className,
}: {
  children: React.ReactNode;
  onGreen?: boolean;
  className?: string;
}) {
  return <h2 className={cn("text-lg font-bold", onGreen ? "text-white" : "text-brand-forest", className)}>{children}</h2>;
}
