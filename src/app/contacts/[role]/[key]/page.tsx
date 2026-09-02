import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Home, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPersonDetail } from "@/lib/contacts-unified";
import { roleBucketLabel, type RoleBucket } from "@/lib/role-bucket";
import { formatMoney } from "@/lib/money";
import { deleteContact, resendContactInvite } from "@/lib/actions/contacts";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "@/components/status-badge";
import { ContactStatusBadge } from "@/components/contact-status-badge";
import { ContactDetailActions } from "@/components/contact-detail-actions";
import { GreenCard, GreenEmptyState } from "@/components/ui/green-card";
import { SectionTitle } from "@/components/ui/section-title";

const VALID_ROLES: RoleBucket[] = ["arrendador", "arrendatario", "corredor"];

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ role: string; key: string }>;
  searchParams: Promise<{ error?: string; linked?: string }>;
}) {
  const { role: roleParam, key: keyParam } = await params;
  if (!VALID_ROLES.includes(roleParam as RoleBucket)) notFound();
  const role = roleParam as RoleBucket;
  const key = decodeURIComponent(keyParam);
  const { error, linked } = await searchParams;

  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const detail = await getPersonDetail(supabase, role, key, userRes.user.id);
  if (!detail) notFound();

  const { row, properties, contracts } = detail;
  const returnTo = `/contacts/${role}/${encodeURIComponent(key)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      <Link href={`/contacts?tab=${role}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Contactos
      </Link>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {linked && (
        <Alert>
          <AlertDescription>
            <strong>{linked}</strong> ya está en Guardanza — quedó vinculado de inmediato, sin necesidad de invitación.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{row.fullName}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{roleBucketLabel(role)}</Badge>
          {row.status ? <ContactStatusBadge status={row.status} /> : <Badge variant="outline">Sin ficha en tu libreta</Badge>}
        </div>
        {(row.email || row.rut) && (
          <p className="mt-1 text-sm text-muted-foreground">{[row.email, row.rut].filter(Boolean).join(" · ")}</p>
        )}
      </div>

      {row.status === "pendiente" ? (
        <GreenEmptyState message="Todavía no confirmó su cuenta — no hay propiedades ni contratos que mostrar hasta que acepte la invitación." />
      ) : (
        <>
          <GreenCard className="p-0">
            <div className="border-b border-white/12 px-4 py-3">
              <SectionTitle onGreen>Propiedades asociadas</SectionTitle>
            </div>
            {properties.length > 0 ? (
              <div className="divide-y divide-white/12">
                {properties.map((p) => (
                  <Link key={p.id} href={`/properties/${p.id}`} className="flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 sm:px-6">
                    <span className="truncate text-sm font-bold">{p.address}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Home className="size-7 text-white/70" strokeWidth={1.5} />
                <p className="text-sm text-white">Sin propiedades asociadas todavía.</p>
              </div>
            )}
          </GreenCard>

          <GreenCard className="p-0">
            <div className="border-b border-white/12 px-4 py-3">
              <SectionTitle onGreen>Contratos asociados</SectionTitle>
            </div>
            {contracts.length > 0 ? (
              <div className="divide-y divide-white/12">
                {contracts.map((c) => (
                  <Link
                    key={c.id}
                    href={`/contracts/${c.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-white hover:bg-white/10 sm:px-6"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-bold">{c.propertyAddress}</p>
                      <p className="text-xs text-white">{formatMoney(c.rentAmount, c.rentCurrency)}/mes</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <FileText className="size-7 text-white/70" strokeWidth={1.5} />
                <p className="text-sm text-white">Sin contratos asociados todavía.</p>
              </div>
            )}
          </GreenCard>
        </>
      )}

      {row.contactId && (
        <ContactDetailActions
          contactId={row.contactId}
          fullName={row.fullName}
          status={row.status === "pendiente" ? "pendiente" : "confirmado"}
          role={role}
          returnTo={returnTo}
          deleteAction={deleteContact}
          resendAction={resendContactInvite}
        />
      )}
    </div>
  );
}
