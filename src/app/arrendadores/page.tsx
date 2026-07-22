import { Scale, ShieldCheck, Eye, PenLine, Landmark } from "lucide-react";
import { PersonaHero } from "@/components/marketing/persona-hero";
import { PersonaBenefits } from "@/components/marketing/persona-benefits";
import { PersonaSteps } from "@/components/marketing/persona-steps";
import { PersonaValue } from "@/components/marketing/persona-value";
import { PersonaCTA } from "@/components/marketing/persona-cta";

const benefits = [
  {
    icon: Scale,
    title: "Neutralidad garantizada",
    description: "Guardanza no es tu aliado ni el de tu arrendatario. Solo un tercero neutral que registra lo acordado.",
  },
  {
    icon: ShieldCheck,
    title: "Custodia clara, no tu palabra",
    description: "La garantía queda registrada en un historial de movimientos visible para ambas partes desde el primer depósito.",
  },
  {
    icon: Eye,
    title: "Resolución justa, siempre",
    description: "Las propuestas de descuento se comparan contra valores de referencia del mercado chileno, no contra el criterio de una sola parte.",
  },
];

const steps = [
  { title: "Registras tu propiedad", detail: "Con los datos del arrendatario y los términos del contrato." },
  { title: "Firman digitalmente", detail: "Tú y el arrendatario, cada uno con su propia firma." },
  { title: "La garantía queda en custodia", detail: "Registrada de forma neutral, visible para ambos." },
  { title: "Al término, propones o resuelves", detail: "Con evidencia y valores de referencia, no con presión." },
];

const valuePoints = [
  { icon: PenLine, text: "Firma digital para ambas partes, con fecha y hora registrada de cada firma." },
  { icon: Landmark, text: "La garantía no queda en tu cuenta personal — así nadie puede acusarte de haberte quedado con ella sin fundamento." },
];

export default function ArrendadoresPage() {
  return (
    <div>
      <PersonaHero
        eyebrow="Para arrendadores"
        title="La garantía de tu arriendo, protegida sin conflictos."
        description="Guardanza custodia la garantía de forma imparcial. Firma digital, historial de movimientos visible para ambas partes, resoluciones basadas en valores de referencia — no en el criterio de una sola parte."
        primaryHref="/signup?role=arrendador"
        primaryLabel="Regístrate gratis"
        secondaryHref="#como-funciona"
        secondaryLabel="Saber más"
      />

      <PersonaBenefits title="Por qué los arrendadores confían en Guardanza" items={benefits} />

      <div id="como-funciona">
        <PersonaSteps title="Cómo protege Guardanza la garantía" items={steps} />
      </div>

      <PersonaValue title="Lo que ya está funcionando" items={valuePoints} />

      <PersonaCTA
        title="Protege tu próxima propiedad"
        description="Registra tu primera propiedad gratis."
        primaryHref="/signup?role=arrendador"
        primaryLabel="Registrar mi propiedad"
        secondaryHref="/login"
        secondaryLabel="Iniciar sesión"
      />
    </div>
  );
}
