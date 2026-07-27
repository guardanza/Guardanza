import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { one } from "@/lib/supabase/one";
import { roleBucketLabel, type RoleBucket } from "@/lib/role-bucket";
import { approveRoleRequest, rejectRoleRequest, changeRoleDirect } from "@/lib/actions/admin/role-requests";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ApproveRoleRequestDialog } from "@/components/admin/approve-role-request-dialog";
import { RejectRoleRequestDialog } from "@/components/admin/reject-role-request-dialog";
import { DirectRoleChangeForm } from "@/components/admin/direct-role-change-form";

const ESTADOS = ["pendiente", "aprobada", "rechazada", "todas"] as const;
const ESTADO_LABEL: Record<(typeof ESTADOS)[number], string> = {
  pendiente: "Pendientes",
  aprobada: "Aprobadas",
  rechazada: "Rechazadas",
  todas: "Todas",
};

export default async function AdminSolicitudesRolPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; error?: string; success?: string; target_user_id?: string }>;
}) {
  const { estado: estadoParam, error, success, target_user_id } = await searchParams;
  const estado = ESTADOS.includes(estadoParam as (typeof ESTADOS)[number]) ? (estadoParam as (typeof ESTADOS)[number]) : "pendiente";

  const supabase = await createClient();

  let query = supabase.from("solicitudes_cambio_rol").select("*").order("created_at", { ascending: false });
  if (estado !== "todas") query = query.eq("estado", estado);
  const { data: solicitudes } = await query;

  const requesterIds = Array.from(new Set((solicitudes ?? []).map((s) => s.user_id)));
  const resolverIds = Array.from(new Set((solicitudes ?? []).map((s) => s.resuelto_por).filter(Boolean)));
  const allIds = Array.from(new Set([...requesterIds, ...resolverIds]));

  const [{ data: profiles }, { data: memberships }, { data: parties }, { users: authUsers }] = await Promise.all([
    allIds.length
      ? supabase.from("profiles").select("id, full_name, rut")
      : Promise.resolve({ data: [] as { id: string; full_name: string; rut: string | null }[] }),
    requesterIds.length
      ? supabase.from("memberships").select("user_id, organizations(name, type)").in("user_id", requesterIds).eq("role", "admin")
      : Promise.resolve({ data: [] as { user_id: string; organizations: unknown }[] }),
    requesterIds.length
      ? supabase.from("contract_parties").select("user_id, contracts(status)").in("user_id", requesterIds)
      : Promise.resolve({ data: [] as { user_id: string; contracts: unknown }[] }),
    createServiceRoleClient()
      .auth.admin.listUsers()
      .then((r) => r.data)
      .catch(() => ({ users: [] as { id: string; email?: string }[] })),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const emailById = new Map(authUsers.map((u) => [u.id, u.email ?? ""]));
  const orgByUser = new Map(
    (memberships ?? []).map((m) => {
      const org = one(m.organizations) as { name: string; type: string } | null;
      return [m.user_id, org];
    })
  );
  const activeCountByUser = new Map<string, number>();
  for (const p of parties ?? []) {
    const contract = one(p.contracts) as { status: string } | null;
    if (contract && contract.status !== "finalizado") {
      activeCountByUser.set(p.user_id, (activeCountByUser.get(p.user_id) ?? 0) + 1);
    }
  }

  const { data: contratosSinCongelar } = await supabase
    .from("contratos_corredor_sin_congelar")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Solicitudes de cambio de rol</h1>
        <p className="text-sm text-muted-foreground">
          El rol de una cuenta lo cambia un administrador. Aprobar o rechazar acá queda registrado en el historial.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="success">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {success === "aprobada" ? "Solicitud aprobada." : success === "rechazada" ? "Solicitud rechazada." : "Rol actualizado."}
            </span>
            {target_user_id && (
              <Link href={`/history?user_id=${target_user_id}`} className="underline underline-offset-4">
                Ver historial de este usuario
              </Link>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        {ESTADOS.map((e) => (
          <Link
            key={e}
            href={`/admin/solicitudes-rol?estado=${e}`}
            className={buttonVariants({ variant: e === estado ? "default" : "outline", size: "sm" })}
          >
            {ESTADO_LABEL[e]}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {(solicitudes ?? []).length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">Sin solicitudes.</CardContent>
          </Card>
        )}
        {(solicitudes ?? []).map((s) => {
          const profile = profileById.get(s.user_id);
          const org = orgByUser.get(s.user_id);
          const activeCount = activeCountByUser.get(s.user_id) ?? 0;
          const resolver = s.resuelto_por ? profileById.get(s.resuelto_por) : null;
          return (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{profile?.full_name || emailById.get(s.user_id) || s.user_id}</CardTitle>
                  <Badge variant={s.estado === "pendiente" ? "outline" : s.estado === "aprobada" ? "default" : "destructive"}>
                    {s.estado}
                  </Badge>
                </div>
                <CardDescription>
                  {emailById.get(s.user_id)} {profile?.rut ? `· RUT ${profile.rut}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">
                  {s.rol_actual_snapshot} <span className="text-muted-foreground">→</span>{" "}
                  <span className="font-medium">{roleBucketLabel(s.rol_solicitado as RoleBucket)}</span>
                </p>
                {s.motivo && <p className="text-sm text-muted-foreground">&ldquo;{s.motivo}&rdquo;</p>}
                <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  {org && (
                    <Badge variant="outline">
                      Administra: {org.name} ({org.type === "broker" ? "corredora" : "arrendador"})
                    </Badge>
                  )}
                  {activeCount > 0 && <Badge variant="outline">{activeCount} contrato(s) activo(s)</Badge>}
                </div>
                {s.estado === "rechazada" && s.motivo_rechazo && (
                  <p className="text-xs text-muted-foreground">Motivo del rechazo: {s.motivo_rechazo}</p>
                )}
                {s.estado !== "pendiente" && resolver && (
                  <p className="text-xs text-muted-foreground">
                    Resuelto por {resolver.full_name} el {new Date(s.resuelto_at).toLocaleString()}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {s.estado === "pendiente" && (
                    <>
                      <ApproveRoleRequestDialog
                        action={approveRoleRequest}
                        solicitudId={s.id}
                        rolSolicitado={s.rol_solicitado}
                        currentOrgLabel={org ? `${org.name} (${org.type === "broker" ? "corredora" : "arrendador"})` : null}
                      />
                      <RejectRoleRequestDialog action={rejectRoleRequest} solicitudId={s.id} />
                    </>
                  )}
                  <Link
                    href={`/history?user_id=${s.user_id}`}
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    Ver historial
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar rol directamente</CardTitle>
          <CardDescription>Sin pasar por una solicitud del usuario. Igual queda en el historial.</CardDescription>
        </CardHeader>
        <CardContent>
          <DirectRoleChangeForm action={changeRoleDirect} />
        </CardContent>
      </Card>

      {contratosSinCongelar && contratosSinCongelar.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-brand-gold" strokeWidth={2} />
              Contratos con corredor sin congelar
            </CardTitle>
            <CardDescription>
              Contratos anteriores a esta funcionalidad — su corredor todavía se deriva del corredor actual de la
              propiedad, no de un registro fijado al momento de la firma. No es un error, es historial previo al
              cambio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {contratosSinCongelar.map((c) => (
              <div key={c.contract_id} className="flex items-center justify-between text-sm">
                <Link href={`/contracts/${c.contract_id}`} className="underline-offset-4 hover:underline">
                  {c.address ?? c.contract_id}
                </Link>
                <Badge variant="outline">{c.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
