import Link from "next/link";
import { Building2, Home, KeyRound, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const segments = [
  {
    href: "/corredores",
    icon: Building2,
    title: "Corredores",
    description: "Gestiona todas tus propiedades y clientes desde un solo lugar, con garantías siempre transparentes.",
  },
  {
    href: "/arrendadores",
    icon: Home,
    title: "Arrendadores",
    description: "Tu garantía queda registrada y protegida, sin depender de la buena fe de nadie.",
  },
  {
    href: "/arrendatarios",
    icon: KeyRound,
    title: "Arrendatarios",
    description: "Tu garantía se devuelve según lo acordado — nunca según el criterio de una sola parte.",
  },
];

export function MarketingHome() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">Guardanza</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          El libro mayor de tu arriendo.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Guardanza registra cada movimiento de la garantía de arriendo, visible para las tres partes al mismo
          tiempo. Ninguna parte decide sola qué pasa con el dinero de la otra.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {segments.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardContent className="space-y-2">
                  <Icon className="size-6 text-primary" strokeWidth={2} />
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                  <p className="flex items-center gap-1 text-sm font-medium text-primary">
                    Conocer más <ArrowRight className="size-3.5" />
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-12 flex justify-center">
        <Link href="/signup" className={buttonVariants({ size: "lg" })}>
          Crear cuenta gratis
        </Link>
      </div>
    </div>
  );
}
