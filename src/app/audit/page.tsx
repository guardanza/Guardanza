import { createClient } from "@/lib/supabase/server";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ contract_id?: string }>;
}) {
  const { contract_id } = await searchParams;
  const supabase = await createClient();

  let entries;
  if (contract_id) {
    // Resolve every entity_id that traces back to this contract, then
    // filter audit_log to exactly those — RLS (can_view_audit_entry) is
    // still the actual access boundary, this just narrows the view.
    const { data: guarantee } = await supabase.from("guarantees").select("id").eq("contract_id", contract_id).maybeSingle();
    const disputeIds: string[] = [];
    const proposalIds: string[] = [];
    if (guarantee) {
      const { data: disputes } = await supabase.from("disputes").select("id").eq("guarantee_id", guarantee.id);
      disputeIds.push(...(disputes ?? []).map((d) => d.id));
      if (disputeIds.length > 0) {
        const { data: proposals } = await supabase.from("proposals").select("id").in("dispute_id", disputeIds);
        proposalIds.push(...(proposals ?? []).map((p) => p.id));
      }
    }

    const entityIds = [contract_id, guarantee?.id, ...disputeIds, ...proposalIds].filter(Boolean) as string[];
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .in("entity_id", entityIds)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    entries = data;
  } else {
    const { data, error } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    entries = data;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-8">
      <h1 className="text-xl font-semibold">Audit log{contract_id ? ` — contrato ${contract_id}` : ""}</h1>
      <ul className="divide-y border text-sm">
        {entries?.map((e) => (
          <li key={e.id} className="p-2">
            <span className="text-gray-500">{e.created_at}</span> — <strong>{e.action}</strong> ({e.entity_type}:
            {e.entity_id})
          </li>
        ))}
        {(!entries || entries.length === 0) && <li className="p-2 text-gray-500">Sin eventos.</li>}
      </ul>
    </div>
  );
}
