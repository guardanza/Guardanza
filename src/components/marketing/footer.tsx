import Link from "next/link";
import { Logo } from "@/components/logo";

// No Legal/Contacto links to real pages or addresses we don't actually
// have yet (Términos, Privacidad, support email) — a dead link or a
// fabricated contact channel is worse than not showing one.
export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="mt-3 max-w-[220px] text-sm text-muted-foreground">El libro mayor de tu garantía de arriendo.</p>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">Producto</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/corredores" className="hover:text-foreground">
                Corredores
              </Link>
            </li>
            <li>
              <Link href="/arrendadores" className="hover:text-foreground">
                Arrendadores
              </Link>
            </li>
            <li>
              <Link href="/arrendatarios" className="hover:text-foreground">
                Arrendatarios
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">Cuenta</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/login" className="hover:text-foreground">
                Iniciar sesión
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-foreground">
                Crear cuenta
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">Legal</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground/60">
            <li>Términos de servicio (próximamente)</li>
            <li>Privacidad (próximamente)</li>
          </ul>
        </div>
      </div>

      <div className="border-t px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} Guardanza — Fase A, servicio en desarrollo.
      </div>
    </footer>
  );
}
