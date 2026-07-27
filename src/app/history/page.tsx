import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ contract_id?: string; user_id?: string }>;
}) {
  const { contract_id, user_id } = await searchParams;
  const supabase = await createClient();

  let entries;
  if (user_id) {
    // "Ver historial" from the role-change admin panel — every audit_log
    // row about this user as either the actor or the entity (covers both
    // profile_role_change entries about them and anything else they did).
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .or(`entity_id.eq.${user_id},actor_user_id.eq.${user_id}`)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    entries = data;
  } else if (contract_id) {
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

  // Resolve names for whoever this page can legitimately show a name for —
  // RLS on audit_log already restricted `entries` to rows this viewer is
  // allowed to see, so resolving names for exactly those actor/entity ids
  // doesn't expose anything the viewer couldn't already infer.
  const profileIds = Array.from(
    new Set(
      (entries ?? []).flatMap((e) => [e.actor_user_id, e.entity_type === "profile_role_change" ? e.entity_id : null].filter(Boolean))
    )
  ) as string[];
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Historial de acciones</h1>
        {contract_id && <p className="text-sm text-muted-foreground">Filtrado por contrato {contract_id}</p>}
        {user_id && (
          <p className="text-sm text-muted-foreground">Filtrado por usuario {nameById.get(user_id) ?? user_id}</p>
        )}
      </div>

      <Card className="overflow-x-auto p-0">
        {entries && entries.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Quién</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.actor_user_id ? (nameById.get(e.actor_user_id) ?? e.actor_user_id.slice(0, 8)) : "—"}
                  </TableCell>
                  <TableCell className="font-medium">{e.action}</TableCell>
                  <TableCell>
                    {e.entity_type === "profile_role_change" ? (
                      <div className="space-y-0.5">
                        <p className="text-sm">
                          {nameById.get(e.entity_id) ?? String(e.entity_id).slice(0, 8)}:{" "}
                          {e.metadata?.rol_anterior_snapshot ? `${e.metadata.rol_anterior_snapshot} → ` : ""}
                          <span className="font-medium">{e.metadata?.rol_nuevo ?? e.metadata?.rol_solicitado}</span>
                        </p>
                        {(e.metadata?.motivo || e.metadata?.motivo_rechazo) && (
                          <p className="text-xs text-muted-foreground">
                            &ldquo;{e.metadata.motivo ?? e.metadata.motivo_rechazo}&rdquo;
                          </p>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="font-mono">
                        {e.entity_type}:{String(e.entity_id).slice(0, 8)}
                      </Badge>
                    )}
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
