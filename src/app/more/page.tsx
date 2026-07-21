import Link from "next/link";
import { redirect } from "next/navigation";
import { Handshake, PenLine, FolderOpen, Bell, Settings, User, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfileTypeLabel } from "@/lib/profile-label";
import { signOut } from "@/lib/actions/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const links = [
  { href: "/proposals", label: "Propuestas de arreglo", icon: Handshake },
  { href: "/signatures", label: "Firmas", icon: PenLine },
  { href: "/documents", label: "Análisis de documentos", icon: FolderOpen },
  { href: "/notifications", label: "Notificaciones", icon: Bell },
  { href: "/profile", label: "Perfil", icon: User },
  { href: "/settings", label: "Configuración", icon: Settings },
];

export default async function MorePage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const profileType = await getProfileTypeLabel(supabase, userRes.user.id);

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-6 md:hidden">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Más</h1>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{userRes.user.email}</p>
          <Badge variant="outline">{profileType}</Badge>
        </div>
      </div>

      <Card className="gap-0 divide-y p-0">
        {links.map((l) => {
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

      <form action={signOut}>
        <button type="submit" className="w-full rounded-lg border px-4 py-3 text-center text-sm font-medium text-destructive">
          Salir
        </button>
      </form>
    </div>
  );
}
