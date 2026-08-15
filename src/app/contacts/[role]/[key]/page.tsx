import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Home, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPersonDetail } from "@/lib/contacts-unified";
import { roleBucketLabel, type RoleBucket } from "@/lib/role-bucket";
import { formatMoney } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { ContactStatusBadge } from "@/components/contact-status-badge";

const VALID_ROLES: RoleBucket[] = ["arrendador", "arrendatario", "corredor"];

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ role: string; key: string }>;
}) {
  const { role: roleParam, key: keyParam } = await params;
  if (!VALID_ROLES.includes(roleParam as RoleBucket)) notFound();
  const role = roleParam as RoleBucket;
  const key = decodeURIComponent(keyParam);

  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const detail = await getPersonDetail(supabase, role, key, userRes.user.id);
  if (!detail) notFound();

  const { row, properties, contracts } = detail;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      <Link href={`/contacts?tab=${role}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Contactos
      </Link>

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
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Todavía no confirmó su cuenta — no hay propiedades ni contratos que mostrar hasta que acepte la invitación.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="p-0">
            <CardHeader className="border-b py-4">
              <CardTitle className="text-base">Propiedades asociadas</CardTitle>
            </CardHeader>
            {properties.length > 0 ? (
              <div className="divide-y">
                {properties.map((p) => (
                  <Link key={p.id} href={`/properties/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 sm:px-6">
                    <span className="truncate text-sm font-medium">{p.address}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <Home className="size-7 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">Sin propiedades asociadas todavía.</p>
              </CardContent>
            )}
          </Card>

          <Card className="p-0">
            <CardHeader className="border-b py-4">
              <CardTitle className="text-base">Contratos asociados</CardTitle>
            </CardHeader>
            {contracts.length > 0 ? (
              <div className="divide-y">
                {contracts.map((c) => (
                  <Link
                    key={c.id}
                    href={`/contracts/${c.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 sm:px-6"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium">{c.propertyAddress}</p>
                      <p className="text-xs text-muted-foreground">{formatMoney(c.rentAmount, c.rentCurrency)}/mes</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <FileText className="size-7 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">Sin contratos asociados todavía.</p>
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
