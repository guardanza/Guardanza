import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createProposal, acceptProposal } from "@/lib/actions/disputes";
import { one } from "@/lib/supabase/one";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: dispute, error } = await supabase.from("disputes").select("*").eq("id", id).single();
  if (error || !dispute) notFound();

  const { data: proposals } = await supabase
    .from("proposals")
    .select("id, status, total_amount, created_by, created_at, proposal_items(description, quantity, unit_price_snapshot, amount)")
    .eq("dispute_id", id)
    .order("created_at", { ascending: false });

  const { data: catalog } = await supabase
    .from("repair_reference_versions")
    .select("id, unit_price, repair_reference(code, description, unit)")
    .is("valid_to", null);

  const latestPending = proposals?.find((p) => p.status === "pendiente");

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Disputa</h1>
        <StatusBadge status={dispute.status} />
      </div>

      <div className="space-y-3">
        <h2 className="font-medium">Propuestas</h2>
        {proposals?.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-lg font-medium">{p.total_amount}</p>
                <StatusBadge status={p.status} />
              </div>
              <ul className="space-y-0.5 text-sm text-muted-foreground">
                {p.proposal_items?.map((it, i) => (
                  <li key={i}>
                    {it.description} — {it.quantity} × {it.unit_price_snapshot ?? "—"} = {it.amount}
                  </li>
                ))}
              </ul>
              {p.status === "pendiente" && (
                <form action={acceptProposal.bind(null, p.id, id)}>
                  <Button type="submit" size="sm">
                    Aceptar
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ))}
        {(!proposals || proposals.length === 0) && (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Sin propuestas todavía.
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{latestPending ? "Contraproponer" : "Nueva propuesta"}</CardTitle>
          <CardDescription>Agrega uno o más ítems — libres o del catálogo de reparaciones.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createProposal} className="space-y-3">
            <input type="hidden" name="dispute_id" value={id} />
            {latestPending && <input type="hidden" name="supersedes_proposal_id" value={latestPending.id} />}

            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-2 border-t pt-3 first:border-t-0 first:pt-0">
                <Input name="item_description" placeholder="Descripción" className="flex-1" />
                <Input name="item_quantity" type="number" step="0.01" defaultValue={1} className="w-16" />
                <select name="item_repair_reference_version_id" className={selectClass}>
                  <option value="">— libre —</option>
                  {catalog?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {one(c.repair_reference)?.description} (${c.unit_price})
                    </option>
                  ))}
                </select>
                <Input name="item_amount" type="number" step="0.01" placeholder="Monto (si es libre)" className="w-32" />
              </div>
            ))}

            <Button type="submit" className="w-full">
              Enviar propuesta
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
