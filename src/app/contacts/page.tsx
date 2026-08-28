import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Mail, Plus, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUnifiedContacts, type UnifiedContactRow } from "@/lib/contacts-unified";
import { roleBucketLabel, type RoleBucket } from "@/lib/role-bucket";
import { deleteContact, resendContactInvite, quickInviteContact } from "@/lib/actions/contacts";
import { isValidEmail } from "@/lib/email";
import { findAccountRoleByEmail } from "@/lib/supabase/find-user-by-email";
import { ContactsSearchField } from "@/components/contacts-search-field";
import { QuickInviteButton } from "@/components/quick-invite-role-sheet";
import { ContactRowMenu } from "@/components/contact-row-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContactStatusBadge } from "@/components/contact-status-badge";
import { UserAvatar } from "@/components/user-avatar";
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

  // Las 3 pestañas se consultan siempre, en PARALELO — antes solo se
  // pedía la activa (salvo con búsqueda, que ya pedía las 3). Ahora hace
  // falta el total de cada una para el contador de las pestañas, y ese
  // número tiene que salir exactamente de la misma fuente que la lista:
  // un contador que no cuadre con lo que se ve abajo es peor que no
  // tenerlo. Contar por separado (ej. un count sobre `contacts`) daría
  // un número distinto, porque la lista además incluye la capa vieja de
  // organizaciones/arrendatarios que no vive en esa tabla.
  //
  // Promise.all, no en serie: el costo de reloj es el de la consulta más
  // lenta, no la suma de las tres — el mismo patrón que ya usaba el
  // camino de búsqueda.
  const perRole = await Promise.all(ALL_ROLES.map((role) => getUnifiedContacts(supabase, role, userRes.user.id)));
  const countByRole = Object.fromEntries(ALL_ROLES.map((role, i) => [role, perRole[i].length])) as Record<RoleBucket, number>;

  // Con búsqueda activa se listan las 3 pestañas juntas (una persona
  // puede existir con cualquier rol, sin importar en cuál estás parado);
  // sin búsqueda, solo la activa, como siempre.
  const rows: RowWithRole[] = prefix
    ? ALL_ROLES.flatMap((role, i) => perRole[i].map((row) => ({ ...row, role })))
    : perRole[ALL_ROLES.indexOf(activeTab)].map((row) => ({ ...row, role: activeTab }));
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
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Contactos</h1>
          <p className="text-sm text-muted-foreground">Arrendadores, arrendatarios y corredoras con los que trabajas.</p>
        </div>
        {orgCount ? (
          <Link href={`/contacts/new?role=${activeTab}`} className={buttonVariants({ size: "sm", className: "shrink-0" })}>
            <Plus className="size-3.5" />
            Nuevo
          </Link>
        ) : null}
      </div>

      {/* grid-cols-3, no flex con overflow-x: las tres pestañas se
          reparten el ancho en tercios exactos y se encogen juntas — nunca
          aparece scroll horizontal. min-w-0 + truncate es lo que hace que
          en una pantalla muy angosta el texto se recorte con elipsis en
          vez de empujar el ancho. */}
      <div className="grid grid-cols-3 gap-2">
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <Link
              key={t.key}
              href={`/contacts?tab=${t.key}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "min-w-0 rounded-xl px-2 py-2 text-center transition-colors",
                active ? "bg-primary text-primary-foreground shadow-sm" : "bg-surface-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="block truncate text-sm font-medium">{t.label}</span>
              <span className={cn("block text-xs tabular-nums", active ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {countByRole[t.key]}
              </span>
            </Link>
          );
        })}
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
            <Card key={`${r.role}-${r.key}`} className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-2">
                {/* after:absolute after:inset-0 ("stretched link"): el <a>
                    solo envuelve avatar+texto, pero su pseudo-elemento
                    cubre toda la tarjeta (Card ya es relative), así que
                    el área tocable es la fila entera — blanco más grande,
                    que es lo que conviene acá. El menú va como hermano
                    con z-10 para quedar por encima de esa capa y seguir
                    siendo clickeable; no puede ir dentro del <a> porque
                    no se anida un botón en un enlace. */}
                <Link
                  href={`/contacts/${r.role}/${encodeURIComponent(r.key)}`}
                  className="flex min-w-0 flex-1 items-center gap-3 after:absolute after:inset-0"
                >
                  {/* size=44 no es solo el tamaño en pantalla: next/image
                      pide al optimizador una miniatura de ese orden (~48/96px
                      para retina), no el original de 400×400 que guarda el
                      bucket. Sumado al loading="lazy" que ya trae UserAvatar,
                      solo se descargan las fotos de las filas visibles. Las
                      iniciales no cuestan red: se pintan al instante y cubren
                      tanto a quien no tiene foto como el rato previo a que
                      cargue. */}
                  <UserAvatar avatarUrl={r.avatarUrl} name={r.fullName} size={44} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-medium">{r.fullName}</p>
                    {(r.email || r.rut) && <p className="truncate text-xs text-muted-foreground">{r.email ?? r.rut}</p>}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* El chip de rol solo cuando hay búsqueda: ahí la
                          lista mezcla las 3 pestañas y sin él no se sabe
                          de cuál viene cada fila. Sin búsqueda todas son
                          del rol de la pestaña activa — repetirlo en cada
                          tarjeta es ruido. */}
                      {prefix && <Badge variant="outline">{roleBucketLabel(r.role)}</Badge>}
                      {displayStatus ? (
                        <ContactStatusBadge status={displayStatus} />
                      ) : (
                        <Badge variant="outline">Sin ficha en tu libreta</Badge>
                      )}
                    </div>
                  </div>
                </Link>
                {r.contactId && (
                  <div className="relative z-10 shrink-0">
                    <ContactRowMenu
                      contactId={r.contactId}
                      fullName={r.fullName}
                      status={r.status === "pendiente" ? "pendiente" : "confirmado"}
                      tab={r.role}
                      deleteAction={deleteContact}
                      resendAction={resendContactInvite}
                    />
                  </div>
                )}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
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
