import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createProposal, acceptProposal } from "@/lib/actions/disputes";
import { one } from "@/lib/supabase/one";

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
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-xl font-semibold">Disputa {id}</h1>
      <p>Estado: {dispute.status}</p>

      <section className="space-y-3">
        <h2 className="font-medium">Propuestas</h2>
        {proposals?.map((p) => (
          <div key={p.id} className="space-y-1 border p-3">
            <p>
              Total: <strong>{p.total_amount}</strong> — {p.status}
            </p>
            <ul className="list-disc pl-5 text-sm">
              {p.proposal_items?.map((it, i) => (
                <li key={i}>
                  {it.description} — {it.quantity} x {it.unit_price_snapshot ?? "—"} = {it.amount}
                </li>
              ))}
            </ul>
            {p.status === "pendiente" && (
              <form action={acceptProposal.bind(null, p.id, id)}>
                <button type="submit" className="bg-black p-1 text-sm text-white">
                  Aceptar
                </button>
              </form>
            )}
          </div>
        ))}
        {(!proposals || proposals.length === 0) && <p className="text-sm text-gray-500">Sin propuestas todavía.</p>}
      </section>

      <section className="space-y-2 border p-4">
        <h2 className="font-medium">
          {latestPending ? "Contraproponer" : "Nueva propuesta"}
        </h2>
        <form action={createProposal} className="space-y-3">
          <input type="hidden" name="dispute_id" value={id} />
          {latestPending && <input type="hidden" name="supersedes_proposal_id" value={latestPending.id} />}

          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-2 border-t pt-2">
              <input name="item_description" placeholder="Descripción" className="flex-1 border p-1" />
              <input name="item_quantity" type="number" step="0.01" defaultValue={1} className="w-16 border p-1" />
              <select name="item_repair_reference_version_id" className="border p-1">
                <option value="">— libre —</option>
                {catalog?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {one(c.repair_reference)?.description} (${c.unit_price})
                  </option>
                ))}
              </select>
              <input name="item_amount" type="number" step="0.01" placeholder="Monto (si es libre)" className="w-32 border p-1" />
            </div>
          ))}

          <button type="submit" className="bg-black p-2 text-white">
            Enviar propuesta
          </button>
        </form>
      </section>
    </div>
  );
}
