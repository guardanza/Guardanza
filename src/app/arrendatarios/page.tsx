import Link from "next/link";
import { KeyRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function ArrendatariosPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 sm:py-24">
      <KeyRound className="mx-auto size-8 text-primary" strokeWidth={1.5} />
      <p className="mt-4 text-xs font-semibold tracking-widest text-primary uppercase">Para arrendatarios</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance">
        Tu garantía se devuelve como se acordó.
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Estamos terminando esta página. Mientras tanto, puedes crear tu cuenta ahora mismo y quedar listo para
        cuando tu arrendador o corredor te invite a un contrato.
      </p>
      <Link href="/signup?role=arrendatario" className={buttonVariants({ size: "lg", className: "mt-8" })}>
        Registrarme como arrendatario
      </Link>
    </div>
  );
}
