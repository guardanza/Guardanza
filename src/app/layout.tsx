import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {userRes.user && (
          <nav className="flex items-center gap-4 border-b p-4 text-sm">
            <Link href="/">Contratos</Link>
            <Link href="/organizations">Organizaciones</Link>
            <Link href="/catalog">Catálogo de reparaciones</Link>
            <Link href="/audit">Audit log</Link>
            <span className="ml-auto text-gray-500">{userRes.user.email}</span>
            <form action={signOut}>
              <button type="submit" className="underline">
                Salir
              </button>
            </form>
          </nav>
        )}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
