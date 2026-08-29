import Link from "next/link";
import { Logo } from "@/components/logo";
import { FOOTER_TAGLINE } from "@/lib/copy";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="mt-3 max-w-[220px] text-sm text-muted-foreground">{FOOTER_TAGLINE}</p>
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
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/terminos" className="hover:text-foreground">
                Términos de servicio
              </Link>
            </li>
            <li>
              <Link href="/privacidad" className="hover:text-foreground">
                Privacidad
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} Guardanza — Custodia de garantías para un arriendo sin conflictos.
      </div>
    </footer>
  );
}
