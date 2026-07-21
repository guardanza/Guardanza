import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { getProfileTypeLabel } from "@/lib/profile-label";
import { Logo, LogoMark } from "@/components/logo";
import { SidebarNav } from "@/components/sidebar-nav";
import { MobileTabBar } from "@/components/mobile-tabbar";
import { MarketingHeader } from "@/components/marketing-header";
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

  const profileType = userRes.user ? await getProfileTypeLabel(supabase, userRes.user.id) : null;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-muted/40">
        {userRes.user ? (
          <div className="flex min-h-full">
            <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-card md:flex">
              <Link href="/" className="flex items-center px-5 py-5">
                <Logo />
              </Link>
              <SidebarNav />
              <div className="mt-auto border-t p-4">
                <div className="flex items-center gap-2.5">
                  <Link
                    href="/profile"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-terracotta text-xs font-medium text-brand-terracotta-foreground"
                  >
                    {userRes.user.email?.[0]?.toUpperCase()}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href="/profile" className="block truncate text-xs font-medium hover:underline">
                      {userRes.user.email}
                    </Link>
                    <p className="truncate text-[11px] text-muted-foreground">{profileType}</p>
                    <form action={signOut}>
                      <button type="submit" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                        Salir
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </aside>

            <header className="fixed inset-x-0 top-0 z-10 flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
              <Link href="/" className="flex items-center">
                <LogoMark size={26} />
              </Link>
              <Link
                href="/more"
                className="flex size-8 items-center justify-center rounded-full bg-brand-terracotta text-xs font-medium text-brand-terracotta-foreground"
              >
                {userRes.user.email?.[0]?.toUpperCase()}
              </Link>
            </header>

            <main className="w-full flex-1 pt-14 pb-16 md:ml-60 md:pt-0 md:pb-0">{children}</main>

            <MobileTabBar />
          </div>
        ) : (
          <>
            <MarketingHeader />
            <main>{children}</main>
          </>
        )}
      </body>
    </html>
  );
}
