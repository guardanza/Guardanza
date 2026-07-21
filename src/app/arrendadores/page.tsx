import Link from "next/link";
import { Home } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function ArrendadoresPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 sm:py-24">
      <Home className="mx-auto size-8 text-primary" strokeWidth={1.5} />
      <p className="mt-4 text-xs font-semibold tracking-widest text-primary uppercase">Para arrendadores</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance">
        Tu garantía, registrada y protegida.
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Estamos terminando esta página. Mientras tanto, puedes crear tu cuenta de arrendador ahora mismo —
        registra tus propiedades y contratos con la misma custodia neutral.
      </p>
      <Link href="/signup?role=arrendador" className={buttonVariants({ size: "lg", className: "mt-8" })}>
        Registrarme como arrendador
      </Link>
    </div>
  );
}
