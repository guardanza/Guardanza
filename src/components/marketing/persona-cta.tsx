import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function PersonaCTA({
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <div className="bg-gradient-to-b from-secondary/40 to-transparent py-16">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <h2 className="text-3xl">{title}</h2>
        <p className="mt-2 text-muted-foreground">{description}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={primaryHref} className={buttonVariants({ size: "lg" })}>
            {primaryLabel}
          </Link>
          <Link href={secondaryHref} className={buttonVariants({ variant: "outline", size: "lg" })}>
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
