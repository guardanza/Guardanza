import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Indicador de avance del wizard de alta de propiedad: "Paso X de N" más
// los círculos numerados conectados por una línea (tilde en vez de
// número para un paso ya completado). Puramente presentacional — la
// página decide en qué paso está, esto solo lo muestra.
export function WizardSteps({ current, total = 2 }: { current: number; total?: number }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Paso {current} de {total}
      </p>
      <div className="flex items-center" aria-hidden>
        {Array.from({ length: total }, (_, i) => i + 1).map((step, i) => (
          <div key={step} className="flex items-center">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                step < current
                  ? "bg-success/15 text-success"
                  : step === current
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {step < current ? <Check className="size-3.5" strokeWidth={2.5} /> : step}
            </span>
            {i < total - 1 && <span className={cn("h-px w-8 shrink-0", step < current ? "bg-success/40" : "bg-border")} />}
          </div>
        ))}
      </div>
    </div>
  );
}
