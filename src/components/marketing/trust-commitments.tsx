import { BookLock, Users, Scale } from "lucide-react";

// Deliberately not third-party rating badges (Trustpilot, Google Reviews)
// — Guardanza has no real reviews yet, and faking ratings/review counts on
// the public production site would be misleading. These are genuine
// product commitments instead. "Pensado para Chile" uses the flag emoji
// rather than a lucide icon — nothing in that set reads as Chilean, and
// the closest generic option (Languages) was getting mistaken for CJK
// characters.
const COMMITMENTS: { icon?: typeof BookLock; emoji?: string; title: string; description: string }[] = [
  { icon: BookLock, title: "Historial de movimientos inmutable", description: "Cada movimiento queda registrado. Nadie puede editarlo después." },
  { icon: Users, title: "Visibilidad total", description: "Arrendador, arrendatario y corredor ven el mismo estado, al mismo tiempo." },
  { icon: Scale, title: "Resolución con criterio", description: "Las propuestas se comparan contra valores de referencia documentados, no contra poder de negociación." },
  { emoji: "🇨🇱", title: "Pensado para Chile", description: "En español, con RUT, UF y el flujo real del arriendo chileno." },
];

export function TrustCommitments() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-center text-3xl">Cómo protegemos la garantía</h2>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COMMITMENTS.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.title} className="rounded-xl border border-border p-4 text-center">
              {Icon ? <Icon className="mx-auto size-6 text-brand-gold" strokeWidth={2} /> : <span className="text-2xl leading-none">{c.emoji}</span>}
              <p className="mt-2 text-sm font-bold text-primary">{c.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
