import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";
import { roleBucketLabel, type RoleBucket } from "@/lib/role-bucket";
import { deleteContact, resendContactInvite } from "@/lib/actions/contacts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Búsqueda por prefijo — misma libreta que ve el usuario vía RLS
// (contacts_select: cualquier miembro de alguna de sus organizaciones).
// Se despoja de caracteres con significado especial para ILIKE (%, _) o
// para la sintaxis .or() de PostgREST (, ( )) antes de armar el patrón;
// esto es higiene de la búsqueda, no una frontera de seguridad — RLS sigue
// aplicando igual sobre el resultado pase lo que pase en el texto.
function sanitizePrefix(q: string): string {
  return q.replace(/[%_,()]/g, "").trim();
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; linked?: string; error?: string }>;
}) {
  const { q, linked, error: actionError } = await searchParams;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { count: orgCount } = await supabase
    .from("memberships")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");

  let query = supabase
    .from("contacts")
    .select("id, contact_role, full_name, email, rut, status, invite_expires_at, role_conflict_at, organizations(name)")
    .order("created_at", { ascending: false });

  const prefix = q ? sanitizePrefix(q) : "";
  if (prefix) {
    query = query.or(`full_name.ilike.${prefix}%,email.ilike.${prefix}%,rut.ilike.${prefix}%`);
  }

  const { data: contacts, error } = await query;
  if (error) throw new Error(error.message);

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
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Contactos</h1>
          <p className="text-sm text-muted-foreground">Personas que cargaste — arrendatarios, arrendadores y corredoras.</p>
        </div>
        {orgCount ? (
          <Link href="/contacts/new" className={buttonVariants()}>
            + Nuevo contacto
          </Link>
        ) : null}
      </div>

      <form className="relative">
        <button
          type="submit"
          aria-label="Buscar"
          className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <Search className="size-4" />
        </button>
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre, email o RUT..."
          className="pl-8"
        />
      </form>

      <div className="space-y-3">
        {contacts?.map((c) => {
          const org = one(c.organizations);
          // "Expirada" y "rol distinto" son estados derivados, no
          // persistidos como tales — la ficha sigue pendiente en la base
          // (no se borra ni al vencer ni al fallar), esto solo cambia
          // cómo se muestra. role_conflict_at pesa más que expirada: si
          // el último intento chocó con la regla de rol, reenviar el
          // token no arregla nada por sí solo, es la primera señal que
          // el admin necesita ver.
          const roleConflict = c.status === "pendiente" && !!c.role_conflict_at;
          const expired = !roleConflict && c.status === "pendiente" && !!c.invite_expires_at && new Date(c.invite_expires_at) < new Date();
          const displayStatus = roleConflict ? "rol_distinto" : expired ? "expirada" : c.status;
          return (
            <Card key={c.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium">{c.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.email} · {c.rut}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="outline">{roleBucketLabel(c.contact_role as RoleBucket)}</Badge>
                    <StatusBadge status={displayStatus} />
                    {org && <span>· {org.name}</span>}
                  </div>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  {c.status === "pendiente" && (
                    <form action={resendContactInvite}>
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        className={buttonVariants({ variant: "outline", size: "sm", className: "w-full sm:w-auto" })}
                      >
                        Reenviar
                      </button>
                    </form>
                  )}
                  <form action={deleteContact}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className={buttonVariants({ variant: "outline", size: "sm", className: "w-full sm:w-auto" })}
                    >
                      Quitar
                    </button>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {contacts && contacts.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <Users className="size-8 text-muted-foreground" strokeWidth={1.5} />
              {prefix ? (
                <>
                  <p className="text-sm text-muted-foreground">No encontramos a nadie con &quot;{q}&quot; en tu libreta.</p>
                  <p className="text-xs text-muted-foreground">Primero crea o invita el contacto.</p>
                  {orgCount ? (
                    <Link href="/contacts/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
                      + Nuevo contacto
                    </Link>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No cargaste ningún contacto todavía.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
