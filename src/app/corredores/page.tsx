import Link from "next/link";
import { ShieldCheck, Users2, TrendingDown, Layers, Building2, User, PenLine, LineChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PersonaHero } from "@/components/marketing/persona-hero";
import { PersonaBenefits } from "@/components/marketing/persona-benefits";
import { PersonaSteps } from "@/components/marketing/persona-steps";
import { PersonaValue } from "@/components/marketing/persona-value";
import { PersonaCTA } from "@/components/marketing/persona-cta";

const benefits = [
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

const valuePoints = [
  { icon: PenLine, text: "Firma digital para arrendador y arrendatario, cada uno con su propia firma y en su propio momento — sin imprimir ni coordinar horarios." },
  { icon: LineChart, text: "Estado de cada contrato, garantía en custodia y comisión, actualizado en tiempo real, desde el computador o el celular." },
];

export default function CorredoresPage() {
  return (
    <div>
      <PersonaHero
        eyebrow="Para corredores"
        title="Corretaje sin quedar en medio de la garantía."
        description="Hoy la garantía pasa por tu cuenta o tu criterio, y eso te hace responsable de una disputa que no es tuya. Con Guardanza, firman digitalmente, la garantía queda en custodia neutral, y tú te enfocas en corretaje."
        primaryHref="/signup?role=corredor"
        primaryLabel="Prueba gratis"
        secondaryHref="#como-funciona"
        secondaryLabel="Ver cómo funciona"
      />

      <PersonaBenefits title="Por qué los corredores usan Guardanza" items={benefits} />

      <div id="como-funciona">
        <PersonaSteps title="Cómo funciona" items={steps} />
      </div>

      <PersonaValue title="Lo que ya está funcionando" items={valuePoints} />

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
      </div>

      <PersonaCTA
        title="¿Listo para dejar de responder por una garantía que no es tuya?"
        description="Crea tu cuenta de corredor gratis."
        primaryHref="/signup?role=corredor"
        primaryLabel="Registrarme como corredor"
        secondaryHref="/login"
        secondaryLabel="Iniciar sesión"
      />
    </div>
  );
}
