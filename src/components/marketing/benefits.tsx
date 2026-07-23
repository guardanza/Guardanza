import { Scale, PenLine, TrendingUp, CreditCard, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { HOME_ATTRIBUTES_TITLE, HOME_ATTRIBUTES, HOME_ROADMAP_TITLE, HOME_ROADMAP } from "@/lib/copy";

const ATTRIBUTE_ICONS = {
  neutralidad: Scale,
  "firma-digital": PenLine,
  resolucion: Scale,
} as const;

const ROADMAP_ICONS = {
  interes: TrendingUp,
  "pago-flexible": CreditCard,
  verificacion: ShieldCheck,
} as const;

export function Benefits() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-center text-3xl">{HOME_ATTRIBUTES_TITLE}</h2>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {HOME_ATTRIBUTES.map((b) => {
          const Icon = ATTRIBUTE_ICONS[b.key as keyof typeof ATTRIBUTE_ICONS];
          return (
            <Card key={b.key} className="border-l-2 border-l-brand-gold transition-shadow hover:shadow-md">
              <CardContent className="space-y-2">
                <Icon className="size-6 text-primary" strokeWidth={2} />
                <p className="text-lg font-bold text-primary">{b.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{b.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-12">
        <p className="text-center text-xs font-semibold tracking-widest text-muted-foreground uppercase">{HOME_ROADMAP_TITLE}</p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {HOME_ROADMAP.map((r) => {
            const Icon = ROADMAP_ICONS[r.key as keyof typeof ROADMAP_ICONS];
            return (
              <div key={r.key} className="rounded-xl border border-dashed border-brand-gold/50 p-4">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-brand-gold" strokeWidth={2} />
                  <p className="text-sm font-bold text-primary">{r.title}</p>
                  <span className="ml-auto rounded-full bg-brand-gold/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-brand-gold uppercase">
                    Próximamente
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{r.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
