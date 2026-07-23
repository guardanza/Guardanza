import { BookLock, Users, Scale, Flag } from "lucide-react";
import { HOME_PROTECTIONS_TITLE, HOME_PROTECTIONS } from "@/lib/copy";

// Deliberately not third-party rating badges (Trustpilot, Google Reviews)
// — Guardanza has no real reviews yet, and faking ratings/review counts on
// the public production site would be misleading. These are genuine
// product commitments instead. "Pensado para Chile" uses the generic
// lucide Flag icon (not the 🇨🇱 emoji) so it stays the same monochrome
// gold tone as the other three — the "Chile" meaning comes from the text.
const PROTECTION_ICONS = {
  registro: BookLock,
  "visibilidad-total": Users,
  criterio: Scale,
  chile: Flag,
} as const;

export function TrustCommitments() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-center text-3xl">{HOME_PROTECTIONS_TITLE}</h2>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HOME_PROTECTIONS.map((c) => {
          const Icon = PROTECTION_ICONS[c.key as keyof typeof PROTECTION_ICONS];
          return (
            <div key={c.key} className="rounded-xl border border-border p-4 text-center">
              <Icon className="mx-auto size-6 text-brand-gold" strokeWidth={2} />
              <p className="mt-2 text-sm font-bold text-primary">{c.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
