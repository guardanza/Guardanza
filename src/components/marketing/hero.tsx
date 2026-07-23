import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { HOME_HERO } from "@/lib/copy";

export function Hero() {
  return (
    <section id="hero" className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16">
      <div>
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">{HOME_HERO.eyebrow}</p>
        <h1 className="mt-3 text-4xl leading-tight font-bold text-balance sm:text-5xl">{HOME_HERO.title}</h1>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">{HOME_HERO.description}</p>

        <span className="mt-6 inline-flex items-center rounded-full bg-brand-gold px-3 py-1 text-xs font-bold tracking-wide text-brand-gold-foreground uppercase">
          {HOME_HERO.badge}
        </span>

        <div className="mt-4 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
          <Link href={HOME_HERO.primaryHref} className={buttonVariants({ size: "xl", className: "w-full sm:w-auto" })}>
            {HOME_HERO.primaryLabel}
            <ArrowRight className="size-4 transition-transform duration-300 group-hover/button:translate-x-1" />
          </Link>
          <a
            href={HOME_HERO.secondaryHref}
            className={buttonVariants({ variant: "outline", size: "xl", className: "w-full sm:w-auto" })}
          >
            {HOME_HERO.secondaryLabel}
          </a>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">{HOME_HERO.supportLine}</p>
      </div>

      <div>
        <div className="relative overflow-hidden rounded-2xl border-2 border-r-0 border-brand-gold shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
          <Image
            src="/hero-skyline.png"
            alt="Skyline de Santiago con una red de nodos conectados, en los colores de marca de Guardanza"
            width={1376}
            height={768}
            className="h-auto w-full object-cover"
            priority
          />
        </div>
      </div>
    </section>
  );
}
