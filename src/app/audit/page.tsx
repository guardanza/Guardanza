import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        {contract_id && <p className="text-sm text-muted-foreground">Filtrado por contrato {contract_id}</p>}
      </div>

      <Card className="p-0">
        {entries && entries.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">{e.action}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {e.entity_type}:{String(e.entity_id).slice(0, 8)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <CardContent className="py-10 text-center text-sm text-muted-foreground">Sin eventos.</CardContent>
        )}
      </Card>
    </div>
  );
}
