import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function CTAFinal() {
  return (
    <section className="bg-gradient-to-b from-secondary/40 to-transparent py-16">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <h2 className="text-3xl">¿Listo para proteger tu garantía?</h2>
        <p className="mt-2 text-muted-foreground">Crea tu cuenta gratis y súmate a Guardanza.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className={buttonVariants({ size: "lg" })}>
            Crear cuenta
          </Link>
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Iniciar sesión
          </Link>
        </div>
      </div>
    </section>
  );
}
