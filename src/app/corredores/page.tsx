import Link from "next/link";
import { ShieldCheck, Users2, TrendingDown, Layers, Building2, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const valueProps = [
  {
    icon: Layers,
    title: "Todas tus propiedades, un solo lugar",
    description: "Contratos, garantías y disputas de todos tus clientes, organizados por propiedad.",
  },
  {
    icon: ShieldCheck,
    title: "Custodia neutral, no tuya ni del banco",
    description: "La garantía queda registrada en Guardanza, no en tu cuenta — nadie puede acusarte de quedarte con ella.",
  },
  {
    icon: TrendingDown,
    title: "Menos reclamos al término del contrato",
    description: "Arrendador y arrendatario ven el mismo registro desde el día uno, así que el cierre no sorprende a nadie.",
  },
  {
    icon: Users2,
    title: "Tu equipo, con roles claros",
    description: "Agrega agentes a tu oficina y todos ven el mismo estado de cada propiedad.",
  },
];

const steps = [
  { title: "Creas tu cuenta de corredora", detail: "Con el RUT de tu oficina o el tuyo si eres independiente." },
  { title: "Vinculas las propiedades", detail: "Las tuyas o las que administras para arrendadores." },
  { title: "Se firma el contrato", detail: "Arrendador y arrendatario firman, la garantía queda en custodia." },
  { title: "Al término, se resuelve entre las partes", detail: "Con propuestas de arreglo, no con tu criterio unilateral." },
];

export default function CorredoresPage() {
  return (
    <div>
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">Para corredores</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Corretaje sin quedar en medio de la garantía.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          Hoy la garantía pasa por tu cuenta o tu criterio, y eso te hace responsable de una disputa que no es
          tuya. Con Guardanza, el dinero queda registrado de forma neutral y tú te enfocas en corretaje.
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {valueProps.map((v) => {
            const Icon = v.icon;
            return (
              <Card key={v.title}>
                <CardContent className="space-y-1.5">
                  <Icon className="size-5 text-primary" strokeWidth={2} />
                  <p className="font-medium">{v.title}</p>
                  <p className="text-sm text-muted-foreground">{v.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="border-y bg-card">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight">Cómo funciona</h2>
          <div className="mt-8 space-y-0">
            {steps.map((s, i) => (
              <div key={s.title} className={`flex gap-4 py-4 ${i !== steps.length - 1 ? "border-b" : ""}`}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Elige cómo trabajas</h2>
        <p className="mt-2 text-sm text-muted-foreground">Ambas cuentas tienen las mismas funciones.</p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href="/signup?role=corredor&legal_form=persona_natural">
            <Card className="h-full transition-colors hover:border-primary">
              <CardContent className="items-center space-y-2 text-center">
                <User className="mx-auto size-6 text-primary" strokeWidth={2} />
                <p className="font-medium">Corredor independiente</p>
                <p className="text-sm text-muted-foreground">Trabajas por cuenta propia.</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/signup?role=corredor&legal_form=empresa">
            <Card className="h-full transition-colors hover:border-primary">
              <CardContent className="items-center space-y-2 text-center">
                <Building2 className="mx-auto size-6 text-primary" strokeWidth={2} />
                <p className="font-medium">Oficina de corretaje</p>
                <p className="text-sm text-muted-foreground">Administras un equipo de agentes.</p>
              </CardContent>
            </Card>
          </Link>
        </div>
        <Link href="/signup?role=corredor" className={buttonVariants({ size: "lg", className: "mt-8" })}>
          Registrarme como corredor
        </Link>
      </div>
    </div>
  );
}
