import Link from "next/link";
import { redirect } from "next/navigation";
import { Handshake, PenLine, ClipboardCheck, History, User, Bell, ShieldCheck, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfileTypeLabel } from "@/lib/profile-label";
import { signOut } from "@/lib/actions/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Same grouping as the desktop sidebar's OPERACIÓN/CUENTA — CARTERA items
// (Propiedades/Contactos/Contratos) live on the bottom tab bar instead,
// same items and order, just a different layout for a 5-icon budget.
const GROUPS: { label: string; items: { href: string; label: string; icon: typeof Handshake }[] }[] = [
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

export default async function MorePage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const profileType = await getProfileTypeLabel(supabase, userRes.user.id);
  const { data: profile } = await supabase.from("profiles").select("is_platform_admin").eq("id", userRes.user.id).single();

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-6 md:hidden">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Más</h1>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{userRes.user.email}</p>
          <Badge variant="outline">{profileType}</Badge>
        </div>
      </div>

      {GROUPS.map((group) => (
        <div key={group.label} className="space-y-1.5">
          <p className="px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">{group.label}</p>
          <Card className="gap-0 divide-y p-0">
            {group.items.map((l) => {
              const Icon = l.icon;
              return (
                <Link key={l.href} href={l.href} className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium">
                  <Icon className="size-4 text-muted-foreground" strokeWidth={2} />
                  <span className="flex-1">{l.label}</span>
                  <ChevronRight className="size-4 text-muted-foreground" strokeWidth={2} />
                </Link>
              );
            })}
          </Card>
        </div>
      ))}

      {profile?.is_platform_admin && (
        <div className="space-y-1.5">
          <Card className="gap-0 divide-y p-0">
            <Link href="/admin/solicitudes-rol" className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium">
              <ShieldCheck className="size-4 text-muted-foreground" strokeWidth={2} />
              <span className="flex-1">Solicitudes de rol</span>
              <ChevronRight className="size-4 text-muted-foreground" strokeWidth={2} />
            </Link>
          </Card>
        </div>
      )}

      <form action={signOut}>
        <button type="submit" className="w-full rounded-lg border px-4 py-3 text-center text-sm font-medium text-destructive">
          Salir
        </button>
      </form>
    </div>
  );
}
