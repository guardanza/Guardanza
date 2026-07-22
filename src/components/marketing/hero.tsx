import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Reuses the logo's shield silhouette at hero scale, with nested layers
// (contrato → garantía → dinero) echoing the design system's "capas de
// protección" idea — each layer a step lighter, forest green to gold.
function ShieldIllustration() {
  return (
    <svg viewBox="0 0 320 320" className="h-full w-full max-w-sm" aria-hidden="true">
      <path
        d="M160 20C118 20 78 34 48 52V150c0 78 44 132 112 150 68-18 112-72 112-150V52c-30-18-70-32-112-32Z"
        fill="var(--color-secondary)"
        stroke="var(--color-primary)"
        strokeWidth="3"
      />
      <rect x="95" y="110" width="130" height="130" rx="10" fill="none" stroke="var(--color-brand-sand)" strokeWidth="2.5" />
      <rect x="120" y="140" width="80" height="70" rx="6" fill="none" stroke="var(--color-brand-gold)" strokeWidth="2.5" />
      <path d="M160 155v40M140 175h40" stroke="var(--color-brand-gold)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Hero() {
  return (
    <section id="hero" className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16">
      <div className="order-2 lg:order-1">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">Guardanza</p>
        <h1 className="mt-3 text-4xl leading-tight font-bold text-balance sm:text-5xl">
          Tu garantía de arriendo, custodiada con transparencia.
        </h1>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
          Guardanza registra cada movimiento de la garantía en un libro mayor visible para arrendador, arrendatario y
          corredor al mismo tiempo. Ninguna parte decide sola qué pasa con el dinero de la otra.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className={buttonVariants({ size: "lg" })}>
            Crear cuenta gratis
          </Link>
          <a href="#como-funciona" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Ver cómo funciona
          </a>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Pensado para arrendadores, arrendatarios y corredores en Chile.</p>
      </div>

      <div className="order-1 flex justify-center lg:order-2">
        <ShieldIllustration />
      </div>
    </section>
  );
}
