import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";

const segments = [
  { href: "/corredores", label: "Corredores" },
  { href: "/arrendadores", label: "Arrendadores" },
  { href: "/arrendatarios", label: "Arrendatarios" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-6">
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium text-muted-foreground md:flex">
          {segments.map((s) => (
            <Link key={s.href} href={s.href} className="transition-colors hover:text-foreground">
              {s.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Entrar
          </Link>
          <Link href="/signup" className={buttonVariants({ size: "sm" })}>
            Registrarme
          </Link>
        </div>
      </div>
    </header>
  );
}
