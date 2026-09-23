"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  PenLine,
  ClipboardCheck,
  Handshake,
  History,
  User,
  Bell,
  ShieldCheck,
} from "lucide-react";

// Defined here (not passed as props from the server layout) because Lucide
// icon components aren't plain serializable objects — passing them across
// the server/client boundary as props throws "Only plain objects can be
// passed to Client Components".
type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };
type NavGroup = { label: string; items: NavItem[] };

const dashboardItem: NavItem = { href: "/", label: "Dashboard", icon: LayoutDashboard };

const GROUPS: NavGroup[] = [
  {
    label: "Cartera",
    items: [
      { href: "/properties", label: "Propiedades", icon: Building2 },
      { href: "/contacts", label: "Contactos", icon: Users },
      { href: "/contracts", label: "Contratos", icon: FileText },
    ],
  },
  {
    label: "Operación",
    items: [
      { href: "/signatures", label: "Firmas pendientes", icon: PenLine },
      { href: "/documents", label: "Evaluaciones", icon: ClipboardCheck },
      { href: "/proposals", label: "Propuestas de descuento", icon: Handshake },
      { href: "/history", label: "Movimientos", icon: History },
    ],
  },
  {
    label: "Cuenta",
    items: [
      { href: "/profile", label: "Perfil", icon: User },
      { href: "/notifications", label: "Notificaciones", icon: Bell },
    ],
  },
];

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// Ítem activo: texto dorado + barra dorada a la izquierda + fondo
// --carbon-elevated (un paso más claro que el carbón del sidebar) — tal
// como pide la imagen de referencia. Dorado como TEXTO acá es seguro
// (sobre carbón, no sobre blanco — ver el comentario de contraste en
// globals.css): 7.5:1, de sobra para texto chico.
function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(item.href, pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={
        "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-brand-gold before:transition-opacity " +
        (active
          ? "bg-sidebar-accent text-sidebar-primary before:opacity-100"
          : "text-white/70 before:opacity-0 hover:bg-white/5 hover:text-white")
      }
    >
      <Icon className="size-4 shrink-0" strokeWidth={2} />
      {item.label}
    </Link>
  );
}

// Group labels are presentational only — 12px uppercase, gris claro sobre
// carbón, tracked out. Not a link, not a button.
function GroupHeader({ label }: { label: string }) {
  return <p className="px-3 pt-4 pb-1 text-xs font-medium tracking-wider text-white/40 uppercase">{label}</p>;
}

export function SidebarNav({ isPlatformAdmin = false }: { isPlatformAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-3">
      <NavLink item={dashboardItem} pathname={pathname} />
      {GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <GroupHeader label={group.label} />
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      ))}
      {isPlatformAdmin && (
        <div className="flex flex-col gap-0.5">
          <div className="my-2 border-t border-white/10" />
          <NavLink item={{ href: "/admin/solicitudes-rol", label: "Solicitudes de rol", icon: ShieldCheck }} pathname={pathname} />
        </div>
      )}
    </nav>
  );
}
