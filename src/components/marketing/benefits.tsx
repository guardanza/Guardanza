import { Scale, ShieldCheck, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const BENEFITS = [
  {
    icon: Scale,
    title: "Neutralidad",
    description: "Guardanza no es arrendador ni arrendatario. Solo árbitro imparcial de la garantía.",
  },
  {
    icon: ShieldCheck,
    title: "Seguridad",
    description:
      "Firma digital para ambas partes, cada una con su propia firma. La garantía queda registrada en un historial de movimientos inmutable, visible para las tres partes al mismo tiempo.",
  },
  {
    icon: Eye,
    title: "Resolución justa, siempre",
    description:
      "Sin sorpresas: las propuestas de descuento se comparan contra valores de referencia del mercado chileno, no contra el criterio de una sola parte.",
  },
];

export function Benefits() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-center text-3xl">¿Por qué Guardanza?</h2>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {BENEFITS.map((b) => {
          const Icon = b.icon;
          return (
            <Card key={b.title}>
              <CardContent className="space-y-2">
                <Icon className="size-6 text-primary" strokeWidth={2} />
                <p className="text-lg font-bold text-primary">{b.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{b.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
