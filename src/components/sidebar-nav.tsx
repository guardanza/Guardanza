"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Building2,
  Users,
  Handshake,
  PenLine,
  FolderOpen,
  Bell,
  Settings,
} from "lucide-react";

// Defined here (not passed as props from the server layout) because Lucide
// icon components aren't plain serializable objects — passing them across
// the server/client boundary as props throws "Only plain objects can be
// passed to Client Components".
const primaryLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contracts", label: "Contratos", icon: FileText },
  { href: "/properties", label: "Propiedades", icon: Building2 },
  { href: "/organizations", label: "Participantes", icon: Users },
  { href: "/proposals", label: "Propuestas de arreglo", icon: Handshake },
];

const secondaryLinks = [
  { href: "/signatures", label: "Firmas", icon: PenLine },
  { href: "/documents", label: "Análisis de documentos", icon: FolderOpen },
  { href: "/notifications", label: "Notificaciones", icon: Bell },
  { href: "/settings", label: "Configuración", icon: Settings },
];

function NavLinks({ links, pathname }: { links: typeof primaryLinks; pathname: string }) {
  return (
    <>
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
    </>
  );
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-3">
      <NavLinks links={primaryLinks} pathname={pathname} />
      <div className="my-2 border-t" />
      <NavLinks links={secondaryLinks} pathname={pathname} />
    </nav>
  );
}
