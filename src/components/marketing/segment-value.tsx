import Link from "next/link";
import { Building2, Home, KeyRound, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { HOME_SEGMENTS_TITLE, HOME_SEGMENTS } from "@/lib/copy";

// Deliberately not testimonials — Guardanza is a new product with no real
// reviews yet, and this is the public production site. Genuine per-persona
// value props instead of fabricated quotes/ratings.
const SEGMENT_ICONS = {
  corredores: Building2,
  arrendadores: Home,
  arrendatarios: KeyRound,
} as const;

export function SegmentValue() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-center text-3xl">{HOME_SEGMENTS_TITLE}</h2>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {HOME_SEGMENTS.map((s) => {
          const Icon = SEGMENT_ICONS[s.key as keyof typeof SEGMENT_ICONS];
          return (
            <Link key={s.href} href={s.href}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardContent className="space-y-2">
                  <Icon className="size-6 text-primary" strokeWidth={2} />
                  <p className="font-bold text-primary">{s.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                  <p className="flex items-center gap-1 text-sm font-medium text-primary">
                    Conocer más <ArrowRight className="size-3.5" />
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
