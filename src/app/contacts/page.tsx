import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUnifiedContacts, type UnifiedContactRow } from "@/lib/contacts-unified";
import { roleBucketLabel, type RoleBucket } from "@/lib/role-bucket";
import { deleteContact, resendContactInvite } from "@/lib/actions/contacts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const TABS: { key: RoleBucket; label: string }[] = [
  { key: "arrendador", label: "Arrendadores / Dueños" },
  { key: "arrendatario", label: "Arrendatarios" },
  { key: "corredor", label: "Corredores" },
];

// Búsqueda por prefijo sobre los datos ya combinados de las dos capas
// (libreta + capa vieja) — no es una sola query SQL como antes (las dos
// capas no comparten una tabla), así que el filtro corre en memoria,
// mismo criterio de "empieza con" que el ILIKE anterior.
function sanitizePrefix(q: string): string {
  return q.trim().toLowerCase();
}

function matchesPrefix(row: UnifiedContactRow, prefix: string): boolean {
  if (!prefix) return true;
  return [row.fullName, row.email, row.rut].some((f) => f?.toLowerCase().startsWith(prefix));
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; linked?: string; error?: string }>;
}) {
  const { tab, q, linked, error: actionError } = await searchParams;
  const activeTab: RoleBucket = TABS.some((t) => t.key === tab) ? (tab as RoleBucket) : "arrendador";

  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { count: orgCount } = await supabase
    .from("memberships")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");

  const rows = await getUnifiedContacts(supabase, activeTab, userRes.user.id);
  const prefix = q ? sanitizePrefix(q) : "";
  const filtered = rows.filter((r) => matchesPrefix(r, prefix));

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      {actionError && (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}
      {linked && (
        <Alert>
          <AlertDescription>
            <strong>{linked}</strong> ya está en Guardanza — se agregó a tus contactos de inmediato, sin necesidad de invitación.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Mis contactos</h1>
          <p className="text-sm text-muted-foreground">Arrendadores, arrendatarios y corredoras con los que trabajás.</p>
        </div>
        {orgCount ? (
          <Link href={`/contacts/new?role=${activeTab}`} className={buttonVariants()}>
            + Nuevo contacto
          </Link>
        ) : null}
      </div>

      <div className="flex gap-1.5 overflow-x-auto rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/contacts?tab=${t.key}`}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <form className="relative">
        <input type="hidden" name="tab" value={activeTab} />
        <button
          type="submit"
          aria-label="Buscar"
          className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <Search className="size-4" />
        </button>
        <Input name="q" defaultValue={q ?? ""} placeholder="Buscar por nombre, email o RUT..." className="pl-8" />
      </form>

      <div className="space-y-3">
        {filtered.map((r) => {
          const roleConflict = r.status === "pendiente" && r.roleConflict;
          const expired = !roleConflict && r.status === "pendiente" && !!r.inviteExpiresAt && new Date(r.inviteExpiresAt) < new Date();
          const displayStatus = roleConflict ? "rol_distinto" : expired ? "expirada" : r.status;
          return (
            <Card key={r.key}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link href={`/contacts/${activeTab}/${encodeURIComponent(r.key)}`} className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-medium hover:underline">{r.fullName}</p>
                  {(r.email || r.rut) && (
                    <p className="truncate text-xs text-muted-foreground">{[r.email, r.rut].filter(Boolean).join(" · ")}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="outline">{roleBucketLabel(activeTab)}</Badge>
                    {displayStatus ? <StatusBadge status={displayStatus} /> : <Badge variant="outline">Sin ficha en tu libreta</Badge>}
                  </div>
                </Link>
                {r.contactId && (
                  <div className="flex w-full gap-2 sm:w-auto">
                    {r.status === "pendiente" && (
                      <form action={resendContactInvite}>
                        <input type="hidden" name="id" value={r.contactId} />
                        <button
                          type="submit"
                          className={buttonVariants({ variant: "outline", size: "sm", className: "w-full sm:w-auto" })}
                        >
                          Reenviar
                        </button>
                      </form>
                    )}
                    <form action={deleteContact}>
                      <input type="hidden" name="id" value={r.contactId} />
                      <button type="submit" className={buttonVariants({ variant: "outline", size: "sm", className: "w-full sm:w-auto" })}>
                        Quitar
                      </button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <Users className="size-8 text-muted-foreground" strokeWidth={1.5} />
              {prefix ? (
                <>
                  <p className="text-sm text-muted-foreground">No encontramos a nadie con &quot;{q}&quot; en esta pestaña.</p>
                  <p className="text-xs text-muted-foreground">Primero crea o invita el contacto.</p>
                  {orgCount ? (
                    <Link href={`/contacts/new?role=${activeTab}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      + Nuevo contacto
                    </Link>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Todavía no tenés a nadie acá.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
