"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Building2, Users, ClipboardList, History } from "lucide-react";

// Defined here (not passed as props from the server layout) because Lucide
// icon components aren't plain serializable objects — passing them across
// the server/client boundary as props throws "Only plain objects can be
// passed to Client Components".
const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contracts", label: "Contratos", icon: FileText },
  { href: "/properties", label: "Propiedades", icon: Building2 },
  { href: "/organizations", label: "Participantes", icon: Users },
  { href: "/catalog", label: "Catálogo", icon: ClipboardList },
  { href: "/audit", label: "Audit log", icon: History },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {links.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
              (active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground")
            }
          >
            <Icon className="size-4 shrink-0" strokeWidth={2} />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
