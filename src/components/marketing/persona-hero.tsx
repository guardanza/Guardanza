import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function PersonaHero({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
      <p className="text-xs font-semibold tracking-widest text-primary uppercase">{eyebrow}</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl">{title}</h1>
      <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={primaryHref} className={buttonVariants({ size: "lg" })}>
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel && (
          <a href={secondaryHref} className={buttonVariants({ variant: "outline", size: "lg" })}>
            {secondaryLabel}
          </a>
        )}
      </div>
    </div>
  );
}
