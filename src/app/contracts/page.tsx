import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ContractsPage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("id, status, start_date, end_date, guarantee_amount, guarantee_currency, properties(address)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const { data: parties } = await supabase
    .from("contract_parties")
    .select("contract_id, role")
    .eq("user_id", userRes.user.id);
  const roleByContract = new Map((parties ?? []).map((p) => [p.contract_id, p.role]));

  // A contract needs an existing participante AND an existing propiedad —
  // the empty state should say exactly what's missing instead of always
  // pointing at "crea un participante" even when one already exists.
  let emptyStateHint: { message: string; cta: { href: string; label: string } } | null = null;
  if (!contracts || contracts.length === 0) {
    const [{ count: orgCount }, { count: propertyCount }] = await Promise.all([
      supabase.from("memberships").select("*", { count: "exact", head: true }).eq("role", "admin"),
      supabase.from("properties").select("*", { count: "exact", head: true }),
    ]);
    if (!orgCount) {
      emptyStateHint = {
        message: "Primero necesitas un participante (arrendador o corredora) para crear un contrato.",
        cta: { href: "/organizations/new", label: "Crear participante" },
      };
    } else if (!propertyCount) {
      emptyStateHint = {
        message: "Ya tienes un participante — ahora agrégale una propiedad para poder crear un contrato.",
        cta: { href: "/properties/new", label: "Agregar propiedad" },
      };
    } else {
      emptyStateHint = {
        message: "Tienes participantes y propiedades listas. Crea tu primer contrato desde una propiedad.",
        cta: { href: "/properties", label: "Ver propiedades" },
      };
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Contratos</h1>
        <p className="text-sm text-muted-foreground">Contratos donde participas como parte o participante.</p>
      </div>

      {contracts && contracts.length > 0 ? (
        <>
          {/* Cards on mobile, table from sm+ — a 4-column table doesn't fit a phone. */}
          <div className="space-y-3 sm:hidden">
            {contracts.map((c) => (
              <Link key={c.id} href={`/contracts/${c.id}`}>
                <Card>
                  <CardContent className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{one(c.properties)?.address ?? c.id}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.guarantee_amount} {c.guarantee_currency} · {roleByContract.get(c.id) ?? "corredor"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Card className="hidden p-0 sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Propiedad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Garantía</TableHead>
                  <TableHead>Tu rol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/contracts/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                        {one(c.properties)?.address ?? c.id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.guarantee_amount} {c.guarantee_currency}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {roleByContract.get(c.id) ?? "corredor (vía participante)"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FileText className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="max-w-xs text-sm text-muted-foreground">{emptyStateHint?.message}</p>
            {emptyStateHint && (
              <Link href={emptyStateHint.cta.href} className={buttonVariants({ size: "sm" })}>
                {emptyStateHint.cta.label}
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
