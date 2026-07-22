import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";

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

      <div className="order-1 lg:order-2">
        <div className="relative overflow-hidden rounded-2xl border border-border shadow-[0_8px_24px_rgba(15,61,46,0.12)]">
          <Image
            src="/hero-arrendataria.webp"
            alt="Arrendataria revisando su contrato de arriendo desde el teléfono"
            width={1024}
            height={559}
            className="h-auto w-full object-cover"
            priority
          />
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-brand-gold/20" />
        </div>
      </div>
    </section>
  );
}
