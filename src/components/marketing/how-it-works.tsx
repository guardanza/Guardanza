import { PenLine, ArrowDownCircle, ShieldCheck, Scale } from "lucide-react";
import { HOME_STEPS_TITLE, HOME_STEPS_SUBTITLE, HOME_STEPS } from "@/lib/copy";

const STEP_ICONS = {
  firma: PenLine,
  deposita: ArrowDownCircle,
  custodia: ShieldCheck,
  resuelve: Scale,
} as const;

export function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-muted/40 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-3xl">{HOME_STEPS_TITLE}</h2>
        <p className="mt-2 text-center text-muted-foreground">{HOME_STEPS_SUBTITLE}</p>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOME_STEPS.map((step, i) => {
            const Icon = STEP_ICONS[step.key as keyof typeof STEP_ICONS];
            return (
              <div key={step.key} className="relative flex flex-col items-center text-center">
                {i < HOME_STEPS.length - 1 && (
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
