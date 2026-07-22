import type { LucideIcon } from "lucide-react";

// Deliberately not testimonials — no fabricated names, companies or star
// ratings on the public production site. Genuine, specific claims about
// what the product actually does instead.
export function PersonaValue({ title, items }: { title: string; items: { icon: LucideIcon; text: string }[] }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h2 className="text-center text-2xl font-semibold tracking-tight">{title}</h2>
      <ul className="mt-8 space-y-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.text} className="flex items-start gap-3 rounded-xl border border-border p-4">
              <Icon className="mt-0.5 size-5 shrink-0 text-brand-gold" strokeWidth={2} />
              <p className="text-sm leading-relaxed text-foreground">{item.text}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
