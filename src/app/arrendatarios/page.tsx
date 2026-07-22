import { Eye, ShieldCheck, Scale, PenLine, FileCheck } from "lucide-react";
import { PersonaHero } from "@/components/marketing/persona-hero";
import { PersonaBenefits } from "@/components/marketing/persona-benefits";
import { PersonaSteps } from "@/components/marketing/persona-steps";
import { PersonaValue } from "@/components/marketing/persona-value";
import { PersonaCTA } from "@/components/marketing/persona-cta";

const benefits = [
  {
    icon: Eye,
    title: "Transparencia total",
    description: "Ves el estado de la garantía en todo momento, con historial de movimientos disponible 24/7. Sin sorpresas.",
  },
  {
    icon: ShieldCheck,
    title: "Protección real",
    description: "Tu dinero queda en custodia neutral, fuera del alcance directo del arrendador.",
  },
  {
    icon: Scale,
    title: "Resoluciones justas",
    description: "Las propuestas de descuento se comparan contra valores de referencia del mercado chileno — nunca se pierde dinero por un capricho.",
  },
];

const steps = [
  { title: "Firmas digitalmente", detail: "Revisas el contrato y firmas con tu propia firma, en tu propio momento." },
  { title: "Tu garantía entra en custodia", detail: "Queda registrada de forma neutral, visible para ti y el arrendador." },
  { title: "Accedes al historial cuando quieras", detail: "El estado de la garantía está disponible en todo momento." },
  { title: "Al término, hay resolución justa", detail: "Si hay desacuerdo, se resuelve con evidencia y valores de referencia — no con el criterio de tu arrendador." },
];

const valuePoints = [
  { icon: PenLine, text: "Firmas el contrato digitalmente, sin imprimir ni coordinar horarios con el arrendador o el corredor." },
  { icon: FileCheck, text: "Si el arrendador propone un descuento sobre la garantía, puedes aceptarlo o rechazarlo con tu propia evidencia — la decisión no es unilateral." },
];

export default function ArrendatariosPage() {
  return (
    <div>
      <PersonaHero
        eyebrow="Para arrendatarios"
        title="Transparencia total sobre la garantía de tu arriendo."
        description="La garantía queda registrada en Guardanza desde el día de la firma. Puedes ver su estado en cualquier momento. Si hay desacuerdo al término del contrato, se resuelve con evidencia y valores de referencia — no con el criterio de tu arrendador."
        primaryHref="/signup?role=arrendatario"
        primaryLabel="Crea tu cuenta"
        secondaryHref="#como-funciona"
        secondaryLabel="Cómo funciona"
      />

      <PersonaBenefits title="Por qué los arrendatarios confían en Guardanza" items={benefits} />

      <div id="como-funciona">
        <PersonaSteps title="El proceso, paso a paso" items={steps} />
      </div>

      <PersonaValue title="Lo que ya está funcionando" items={valuePoints} />

      <PersonaCTA
        title="Comienza protegido"
        description="Crea tu cuenta gratis y queda listo para tu próximo contrato."
        primaryHref="/signup?role=arrendatario"
        primaryLabel="Crear cuenta gratis"
        secondaryHref="/login"
        secondaryLabel="Iniciar sesión"
      />
    </div>
  );
}
