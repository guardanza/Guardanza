import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createProposal, acceptProposal, rejectProposal, resolveDisputeAdmin } from "@/lib/actions/disputes";
import { one } from "@/lib/supabase/one";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_platform_admin").eq("id", userRes.user.id).single();
  const isPlatformAdmin = profile?.is_platform_admin ?? false;

  const { data: dispute, error } = await supabase.from("disputes").select("*, guarantees(amount, currency)").eq("id", id).single();
  if (error || !dispute) notFound();
  const guarantee = one(dispute.guarantees);

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
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Disputa</h1>
        <StatusBadge status={dispute.status} />
      </div>

      {dispute.status === "escalada" && dispute.motivo_rechazo && (
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader>
            <CardTitle className="text-sm">Motivo del rechazo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{dispute.motivo_rechazo}</p>
          </CardContent>
        </Card>
      )}

      {dispute.status === "escalada" && isPlatformAdmin && guarantee && (
        <Card className="border-amber-200 dark:border-amber-900/50">
          <CardHeader>
            <CardTitle className="text-sm">Resolver como administrador</CardTitle>
            <CardDescription>
              Garantía en custodia: {guarantee.amount} {guarantee.currency}. Define cuánto se retiene a favor del
              arrendador — el resto se devuelve al arrendatario.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={resolveDisputeAdmin.bind(null, id)} className="space-y-3">
              <div className="space-y-1.5">
                <Input name="monto_retenido" type="number" step="0.01" min={0} max={guarantee.amount} placeholder="Monto a retener (CLP)" required />
              </div>
              <Textarea name="notas" placeholder="Notas internas del arbitraje (opcional)" rows={3} />
              <Button type="submit" variant="outline" className="w-full">
                Ejecutar resolución
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

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
                <div className="flex flex-wrap items-start gap-2">
                  <form action={acceptProposal.bind(null, p.id, id)}>
                    <Button type="submit" size="sm">
                      Aceptar
                    </Button>
                  </form>

                  <details className="group">
                    <summary className="flex h-8 cursor-pointer list-none items-center rounded-md border border-input px-3 text-sm font-medium">
                      Rechazar
                    </summary>
                    <form action={rejectProposal.bind(null, p.id, id)} className="mt-2 w-64 space-y-2">
                      <Textarea
                        name="motivo_rechazo"
                        placeholder="Explica por qué rechazas esta propuesta (mínimo 50 caracteres)."
                        minLength={50}
                        required
                        rows={3}
                      />
                      <Button type="submit" size="sm" variant="destructive">
                        Confirmar rechazo y abrir disputa
                      </Button>
                    </form>
                  </details>
                </div>
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
              <div key={i} className="flex flex-col gap-2 border-t pt-3 first:border-t-0 first:pt-0 sm:flex-row">
                <Input name="item_description" placeholder="Descripción" className="flex-1" />
                <div className="flex gap-2">
                  <Input name="item_quantity" type="number" step="0.01" defaultValue={1} className="w-16" />
                  <select name="item_repair_reference_version_id" className={`flex-1 sm:flex-none ${selectClass}`}>
                    <option value="">— libre —</option>
                    {catalog?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {one(c.repair_reference)?.description} (${c.unit_price})
                      </option>
                    ))}
                  </select>
                </div>
                <Input name="item_amount" type="number" step="0.01" placeholder="Monto (si es libre)" className="sm:w-32" />
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
