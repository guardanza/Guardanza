import { PenLine, ArrowDownCircle, ShieldCheck, Scale } from "lucide-react";

const STEPS = [
  { icon: PenLine, title: "Firma", description: "Arrendador y arrendatario firman el contrato digitalmente, cada uno por su parte." },
  { icon: ArrowDownCircle, title: "Deposita", description: "La garantía se registra como depositada en custodia." },
  { icon: ShieldCheck, title: "Custodia", description: "Guardanza mantiene el registro neutral mientras el contrato está vigente." },
  { icon: Scale, title: "Resuelve", description: "Al terminar, las propuestas se aceptan o se resuelven con un tercero neutral — nunca por decisión unilateral." },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-muted/40 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-3xl">Cómo funciona Guardanza</h2>
        <p className="mt-2 text-center text-muted-foreground">4 pasos simples</p>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="relative flex flex-col items-center text-center">
                {i < STEPS.length - 1 && (
                  <div className="absolute top-6 left-[calc(50%+28px)] hidden h-px w-[calc(100%-56px)] bg-border lg:block" />
                )}
                <div className="relative flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon className="size-5" strokeWidth={2} />
                  <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-brand-gold text-[10px] font-bold text-brand-gold-foreground">
                    {i + 1}
                  </span>
                </div>
                <p className="mt-3 font-bold text-primary">{step.title}</p>
                <p className="mt-1 max-w-[200px] text-sm text-muted-foreground">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
