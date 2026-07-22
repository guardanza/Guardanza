"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";

const segments = [
  { href: "/corredores", label: "Corredores" },
  { href: "/arrendadores", label: "Arrendadores" },
  { href: "/arrendatarios", label: "Arrendatarios" },
];

export function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-6">
        <Link href="/" className="flex items-center" onClick={() => setMenuOpen(false)}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium text-muted-foreground md:flex">
          {segments.map((s) => (
            <Link key={s.href} href={s.href} className="transition-colors hover:text-foreground">
              {s.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Entrar
          </Link>
          <Link href="/signup" className={buttonVariants({ size: "sm" })}>
            Registrarme
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-3 md:hidden">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Entrar
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            className="flex size-9 items-center justify-center rounded-lg text-primary hover:bg-muted"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      {/* Full-screen mobile menu */}
      <div
        className={`fixed inset-0 z-30 bg-background transition-opacity duration-300 md:hidden ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Logo />
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
            className="flex size-9 items-center justify-center rounded-lg text-primary hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex flex-col px-4 py-6">
          {segments.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              onClick={() => setMenuOpen(false)}
              className="border-l-2 border-transparent px-3 py-3 text-base font-medium text-primary transition-colors hover:border-brand-sand hover:text-brand-sand-foreground"
            >
              {s.label}
            </Link>
          ))}
          <Link
            href="/signup"
            onClick={() => setMenuOpen(false)}
            className={buttonVariants({ size: "lg", className: "mt-6" })}
          >
            Registrarme
          </Link>
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-3" })}
          >
            Iniciar sesión
          </Link>
        </nav>
      </div>
    </header>
  );
}
