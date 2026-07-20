import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function DashboardPage() {
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

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tus contratos</h1>
          <p className="text-sm text-muted-foreground">Contratos donde participas como parte u organización.</p>
        </div>
        <Link href="/organizations" className={buttonVariants({ variant: "outline" })}>
          Tus organizaciones
        </Link>
      </div>

      <Card className="p-0">
        {contracts && contracts.length > 0 ? (
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
                    {roleByContract.get(c.id) ?? "corredor (vía organización)"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Sin contratos todavía. Crea una organización para empezar.
          </CardContent>
        )}
      </Card>
    </div>
  );
}
