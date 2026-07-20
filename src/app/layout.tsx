import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { orgRoleLabel } from "@/lib/labels";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Guardanza",
  description: "Custodia neutral de garantías de arriendo — Fase A (demo simulado)",
};

const navLinks = [
  { href: "/", label: "Contratos" },
  { href: "/organizations", label: "Organizaciones" },
  { href: "/catalog", label: "Catálogo" },
  { href: "/audit", label: "Audit log" },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();

  let roles: { name: string; role: string }[] = [];
  if (userRes.user) {
    const { data: memberships } = await supabase.from("memberships").select("role, organizations(name)");
    roles = (memberships ?? [])
      .map((m) => {
        const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
        return org ? { name: org.name, role: orgRoleLabel(m.role) } : null;
      })
      .filter((x): x is { name: string; role: string } => x !== null);
  }

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-muted/40">
        {userRes.user && (
          <header className="sticky top-0 z-10 border-b bg-card">
            <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-6">
              <Link href="/" className="text-xs font-semibold tracking-widest text-primary uppercase">
                Guardanza
              </Link>
              <nav className="flex items-center gap-4 text-sm text-muted-foreground">
                {navLinks.map((l) => (
                  <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                ))}
              </nav>
              <div className="ml-auto flex items-center gap-3">
                <div
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-terracotta text-xs font-medium text-brand-terracotta-foreground"
                  title={roles.length > 0 ? roles.map((r) => `${r.name} (${r.role})`).join(", ") : "Sin organizaciones todavía"}
                >
                  {userRes.user.email?.[0]?.toUpperCase()}
                </div>
                <span className="hidden text-sm text-muted-foreground sm:inline">{userRes.user.email}</span>
                <form action={signOut}>
                  <button type="submit" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    Salir
                  </button>
                </form>
              </div>
            </div>
          </header>
        )}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
