import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUnifiedContacts, type UnifiedContactRow } from "@/lib/contacts-unified";
import { roleBucketLabel, type RoleBucket } from "@/lib/role-bucket";
import { deleteContact, resendContactInvite, quickInviteContact } from "@/lib/actions/contacts";
import { isValidEmail } from "@/lib/email";
import { findAccountRoleByEmail } from "@/lib/supabase/find-user-by-email";
import { ContactsSearchField } from "@/components/contacts-search-field";
import { QuickInviteButton } from "@/components/quick-invite-role-sheet";
import { DeleteContactDialog } from "@/components/delete-contact-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContactStatusBadge } from "@/components/contact-status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const TABS: { key: RoleBucket; label: string }[] = [
  { key: "arrendador", label: "Arrendadores" },
  { key: "arrendatario", label: "Arrendatarios" },
  { key: "corredor", label: "Corredores" },
];
const ALL_ROLES = TABS.map((t) => t.key);

type RowWithRole = UnifiedContactRow & { role: RoleBucket };

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
  searchParams: Promise<{
    tab?: string;
    q?: string;
    linked?: string;
    invited?: string;
    existingEmail?: string;
    existingRole?: string;
    error?: string;
  }>;
}) {
  const { tab, q, linked, invited, existingEmail, existingRole: existingRoleParam, error: actionError } = await searchParams;
  const activeTab: RoleBucket = TABS.some((t) => t.key === tab) ? (tab as RoleBucket) : "arrendador";

  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: adminMembership } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("role", "admin")
    .maybeSingle();
  const orgCount = !!adminMembership;

  const trimmedQuery = (q ?? "").trim();
  const prefix = trimmedQuery ? sanitizePrefix(trimmedQuery) : "";
  const queryLooksLikeEmail = isValidEmail(trimmedQuery);

  // Cambio 1: con búsqueda activa, se consultan las 3 pestañas (una
  // persona puede existir con cualquier rol, sin importar en cuál estás
  // parado) — sin búsqueda, se sigue navegando/filtrando por la pestaña
  // activa nomás, como siempre.
  let rows: RowWithRole[];
  if (prefix) {
    const perRole = await Promise.all(ALL_ROLES.map((role) => getUnifiedContacts(supabase, role, userRes.user.id)));
    rows = ALL_ROLES.flatMap((role, i) => perRole[i].map((row) => ({ ...row, role })));
  } else {
    const activeRows = await getUnifiedContacts(supabase, activeTab, userRes.user.id);
    rows = activeRows.map((row) => ({ ...row, role: activeTab }));
  }
  const filtered = rows.filter((r) => matchesPrefix(r, prefix));

  // Si ya llegó un existingRole por redirect (un intento de invitar
  // chocó con "camino 3"), se usa ese. Si no, y la búsqueda es un email
  // que no dio resultados en NINGUNA pestaña, se chequea proactivamente
  // si esa cuenta ya existe con otro rol — así el aviso educativo
  // aparece ANTES de ofrecer invitar, no como sorpresa después de
  // intentarlo.
  let existingAccountRole: RoleBucket | null = TABS.some((t) => t.key === existingRoleParam) ? (existingRoleParam as RoleBucket) : null;
  const existingAccountEmail = existingAccountRole ? (existingEmail ?? trimmedQuery) : null;
  if (!existingAccountRole && filtered.length === 0 && prefix && orgCount && queryLooksLikeEmail) {
    existingAccountRole = await findAccountRoleByEmail(trimmedQuery);
  }
  const resolvedExistingEmail = existingAccountRole ? (existingAccountEmail ?? trimmedQuery) : null;
  // Que la cuenta ya exista no siempre es un conflicto: si el rol
  // coincide con la pestaña activa, no hay nada que impida agregarla —
  // load_contact() la vincula directo (camino 2), sin invitación. El
  // aviso "un solo rol" solo aplica cuando el rol es distinto al que
  // se está por cargar.
  const roleConflictsWithTab = !!existingAccountRole && existingAccountRole !== activeTab;
  const sameRoleAsTab = !!existingAccountRole && existingAccountRole === activeTab;

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
      {invited && (
        <Alert>
          <AlertDescription>
            Invitación enviada a <strong>{invited}</strong>.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Contactos</h1>
          <p className="text-sm text-muted-foreground">Arrendadores, arrendatarios y corredoras con los que trabajas.</p>
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
              activeTab === t.key
                ? "bg-card text-foreground shadow-sm ring-1 ring-inset ring-brand-gold/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <ContactsSearchField tab={activeTab} initialQuery={q ?? ""} />

      <div className="space-y-3">
        {filtered.map((r) => {
          // Rechazada primero: es la señal más completa (la persona dijo
          // que no, a propósito) — si además queda una marca vieja de
          // rol_distinto de un intento anterior (el rechazo no la borra,
          // solo invalida el token), no tiene sentido mostrar esa en vez
          // de "rechazada". expirada no puede coexistir con rechazada —
          // rechazar ya deja invite_expires_at en null.
          const rejected = r.status === "pendiente" && r.inviteRejectedAt;
          const roleConflict = !rejected && r.status === "pendiente" && r.roleConflict;
          const expired = !rejected && !roleConflict && r.status === "pendiente" && !!r.inviteExpiresAt && new Date(r.inviteExpiresAt) < new Date();
          const displayStatus = rejected ? "invitacion_rechazada" : roleConflict ? "rol_distinto" : expired ? "expirada" : r.status;
          return (
            <Card key={`${r.role}-${r.key}`}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link href={`/contacts/${r.role}/${encodeURIComponent(r.key)}`} className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-medium hover:underline">{r.fullName}</p>
                  {(r.email || r.rut) && (
                    <p className="truncate text-xs text-muted-foreground">{[r.email, r.rut].filter(Boolean).join(" · ")}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="outline">{roleBucketLabel(r.role)}</Badge>
                    {displayStatus ? <ContactStatusBadge status={displayStatus} /> : <Badge variant="outline">Sin ficha en tu libreta</Badge>}
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
                    <DeleteContactDialog
                      action={deleteContact}
                      contactId={r.contactId}
                      fullName={r.fullName}
                      status={r.status === "pendiente" ? "pendiente" : "confirmado"}
                      tab={r.role}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && !prefix && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <Users className="size-8 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">Todavía no tienes a nadie acá.</p>
            </CardContent>
          </Card>
        )}

        {/* Una persona tiene un solo rol en la plataforma — si la
            búsqueda (global, las 3 pestañas) no encontró a nadie en TU
            libreta y el email ya tiene cuenta con OTRO rol (distinto al
            de la pestaña activa), esto se muestra en vez del CTA de
            invitar/agregar: no hay nada que ofrecer, es un conflicto
            real. Es información, no un error: mismo trato visual
            amable que el aviso de agregar/invitar. */}
        {filtered.length === 0 && prefix && roleConflictsWithTab && resolvedExistingEmail && (
          <Card className="border-brand-gold/40 bg-brand-gold/5">
            <CardContent className="flex items-start gap-3">
              <Mail className="mt-0.5 size-5 shrink-0 text-brand-gold" strokeWidth={2} />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-primary">
                  <span className="break-all">{resolvedExistingEmail}</span> ya está en Guardanza como{" "}
                  {roleBucketLabel(existingAccountRole!)}.
                </p>
                <p className="text-xs text-muted-foreground">Una persona tiene un solo rol en la plataforma.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sin resultados de búsqueda (y sin conflicto de rol): un solo
            camino claro hacia sumar a la persona, no un botón genérico.
            Si el email ya tiene cuenta con el MISMO rol de la pestaña
            activa, load_contact() la vincula directo al confirmar (sin
            invitación) — se ofrece "Agregar", no "Invitar". Si el email
            es nuevo se ofrece invitarla (sin retipear); si se buscó por
            nombre/RUT, se pide el email. Los tres caminos disparan la
            misma acción real de siempre (quickInviteContact reusa
            load_contact/issue_contact_invite). */}
        {filtered.length === 0 && prefix && !roleConflictsWithTab && orgCount && (
          <Card className="border-brand-gold/40 bg-brand-gold/5">
            <CardContent className="flex items-start gap-3">
              <Mail className="mt-0.5 size-5 shrink-0 text-brand-gold" strokeWidth={2} />
              {sameRoleAsTab ? (
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-primary">
                    <span className="break-all">{resolvedExistingEmail}</span> ya está en Guardanza como{" "}
                    {roleBucketLabel(existingAccountRole!)}.
                  </p>
                  <p className="text-xs text-muted-foreground">No hace falta invitarla de nuevo: solo agrégala a tu libreta.</p>
                  <form action={quickInviteContact}>
                    <input type="hidden" name="tab" value={activeTab} />
                    <input type="hidden" name="email" value={resolvedExistingEmail ?? trimmedQuery} />
                    <Button type="submit" size="sm">
                      Agregar
                    </Button>
                  </form>
                </div>
              ) : queryLooksLikeEmail ? (
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-primary">
                    <span className="break-all">{trimmedQuery}</span> no tiene cuenta en Guardanza.
                  </p>
                  <p className="text-xs text-muted-foreground">Invita a esta persona a sumarse a Guardanza.</p>
                  <QuickInviteButton action={quickInviteContact} email={trimmedQuery} />
                </div>
              ) : (
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-primary">No encontramos a nadie con &quot;{trimmedQuery}&quot;.</p>
                  <p className="text-xs text-muted-foreground">Invita a esta persona por email:</p>
                  <QuickInviteButton action={quickInviteContact} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {filtered.length === 0 && prefix && !existingAccountRole && !orgCount && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <Users className="size-8 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">No encontramos a nadie con &quot;{trimmedQuery}&quot;.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
