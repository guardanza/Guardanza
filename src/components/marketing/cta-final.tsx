import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { HOME_CTA_FINAL } from "@/lib/copy";

export function CTAFinal() {
  return (
    <section className="bg-gradient-to-b from-secondary/40 to-transparent py-16">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <h2 className="text-3xl">{HOME_CTA_FINAL.title}</h2>
        <p className="mt-2 text-muted-foreground">{HOME_CTA_FINAL.description}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Link href={HOME_CTA_FINAL.primaryHref} className={buttonVariants({ size: "xl", className: "w-full sm:w-auto" })}>
            {HOME_CTA_FINAL.primaryLabel}
          </Link>
          <Link
            href={HOME_CTA_FINAL.secondaryHref}
            className={buttonVariants({ variant: "outline", size: "xl", className: "w-full sm:w-auto" })}
          >
            {HOME_CTA_FINAL.secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
