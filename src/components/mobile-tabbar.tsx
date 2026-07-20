"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Building2, Users, MoreHorizontal } from "lucide-react";

// Bottom tab bar only has room for ~5 items on a phone; the rest live on
// /more (a plain page, not a popover — overlay menus have been unreliable
// in this app's testing, and "more" is a well-understood mobile pattern).
// Defined here rather than passed as a prop for the same reason as
// SidebarNav: Lucide icon components can't cross the server/client prop
// boundary.
const links = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/contracts", label: "Contratos", icon: FileText },
  { href: "/properties", label: "Propiedades", icon: Building2 },
  { href: "/organizations", label: "Participantes", icon: Users },
  { href: "/more", label: "Más", icon: MoreHorizontal },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-stretch justify-around border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
      {links.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium " +
              (active ? "text-primary" : "text-muted-foreground")
            }
          >
            <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
