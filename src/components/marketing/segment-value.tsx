import Link from "next/link";
import { Building2, Home, KeyRound, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Deliberately not testimonials — Guardanza is a new product with no real
// reviews yet, and this is the public production site. Genuine per-persona
// value props instead of fabricated quotes/ratings.
const SEGMENTS = [
  {
    href: "/corredores",
    icon: Building2,
    title: "Para corredores",
    description:
      "Gestiona todas tus propiedades y clientes desde un solo lugar. Cada garantía queda registrada y visible, sin depender de tu palabra frente al arrendador o al arrendatario.",
  },
  {
    href: "/arrendadores",
    icon: Home,
    title: "Para arrendadores",
    description:
      "Tu garantía queda registrada y protegida desde el primer depósito, sin depender de la buena fe de nadie ni de un tercero que favorezca a una de las partes.",
  },
  {
    href: "/arrendatarios",
    icon: KeyRound,
    title: "Para arrendatarios",
    description:
      "Tu garantía se devuelve según lo acordado en el contrato — nunca según el criterio de una sola parte. Si hay desacuerdo, se resuelve con evidencia, no con poder.",
  },
];

export function SegmentValue() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-center text-3xl">Pensado para cada parte</h2>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SEGMENTS.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardContent className="space-y-2">
                  <Icon className="size-6 text-primary" strokeWidth={2} />
                  <p className="font-bold text-primary">{s.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                  <p className="flex items-center gap-1 text-sm font-medium text-primary">
                    Conocer más <ArrowRight className="size-3.5" />
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
