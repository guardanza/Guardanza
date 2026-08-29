import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// Envoltorio compartido por /terminos y /privacidad — páginas de
// contenido puro, sin lógica. Ancho de lectura angosto (max-w-2xl, no el
// max-w-6xl de las páginas de marketing) a propósito: son párrafos
// largos, no tarjetas ni columnas, y una línea de texto de lado a lado
// en desktop es incómoda de leer.
//
// Deliberadamente NO fuerza el layout de invitado (MarketingHeader) ni
// el de sesión iniciada (sidebar/tabbar) — ambos ya los pone
// RootLayout automáticamente según haya sesión o no. Estas páginas no
// llevan ningún chequeo de auth: tienen que ser legibles con o sin
// sesión, y de las dos maneras quedan con navegación real alrededor.
export function LegalPage({ title, updatedAt, children }: { title: string; updatedAt: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-6 md:py-16">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Guardanza
      </Link>

      <div className="mt-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">Última actualización: {updatedAt}</p>
      </div>

      <div className="mt-8 space-y-5 text-sm leading-relaxed text-foreground md:text-base">{children}</div>

      <div className="mt-12 border-t pt-6 text-sm text-muted-foreground">
        ¿Dudas? Escríbenos a{" "}
        <a href="mailto:contacto@guardanza.app" className="text-foreground underline underline-offset-4 hover:text-primary">
          contacto@guardanza.app
        </a>
        .
      </div>
    </div>
  );
}

// Título de sección numerado ("1. Qué es Guardanza") — mismo tratamiento
// en las dos páginas. id explícito (no derivado del texto) para que los
// cross-links entre secciones (ej. "sección 5" en Términos) apunten a
// algo estable, sin depender de slugificar el título.
export function LegalSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
}
