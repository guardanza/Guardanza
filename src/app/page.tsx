import Link from "next/link";
import { Suspense } from "react";
import { Landmark, FileText, AlertTriangle, CalendarClock, ShieldCheck, Percent, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";
import { GreenCard } from "@/components/ui/green-card";
import { StatusBadge } from "@/components/status-badge";
import { MarketingHome } from "@/components/marketing-home";
import { getPendingCandidateEvaluations } from "@/lib/candidate-evaluations-pending";
import { participantInviteTitle } from "@/lib/candidate-participant-messaging";
import { DashboardCardsSkeleton } from "@/components/skeletons/dashboard-cards-skeleton";
import { DashboardDetailsSkeleton } from "@/components/skeletons/dashboard-details-skeleton";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";

function formatAmount(amount: number, currency: string) {
  if (currency === "UF") return `UF ${amount.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${Math.round(amount).toLocaleString("es-CL")}`;
}

// Tarjeta de estadística del dashboard — mismo sistema verde que el
// resto de la app (ver /estilos), ícono + rótulo en blanco, número
// grande en blanco bold. Solo se usa acá (5 veces), por eso vive local
// en vez de en ui/green-card.tsx junto a los primitivos genéricos.
function StatCard({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; children: React.ReactNode }) {
  return (
    <GreenCard className="p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-white">
        <Icon className="size-3.5" strokeWidth={2} />
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </GreenCard>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return <MarketingHome />;

  const { data: profile } = await supabase.from("profiles").select("is_platform_admin").eq("id", userRes.user.id).single();
  const isPlatformAdmin = profile?.is_platform_admin ?? false;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {isPlatformAdmin
            ? "Visibilidad total del sistema: garantías y contratos de todas las organizaciones."
            : "Estado general de tus garantías y contratos."}
        </p>
      </div>

      {/* Two independent Suspense regions so the cards don't wait on the
          detail sections (and vice versa) — each streams in as soon as its
          own queries resolve, instead of the whole page blocking on
          everything at once. */}
      <Suspense fallback={<DashboardCardsSkeleton />}>
        <SummaryCards userId={userRes.user.id} isPlatformAdmin={isPlatformAdmin} />
      </Suspense>

      <Suspense fallback={<DashboardDetailsSkeleton />}>
        <DashboardDetails userId={userRes.user.id} />
      </Suspense>
    </div>
  );
}

async function SummaryCards({ userId, isPlatformAdmin }: { userId: string; isPlatformAdmin: boolean }) {
  const supabase = await createClient();

  const [{ data: contracts }, { data: guarantees }, { data: disputes }, { data: brokerMemberships }] = await Promise.all([
    supabase.from("contracts").select("id, status, comision_guardanza_monto, properties(broker_organization_id)"),
    supabase.from("guarantees").select("status, amount, currency"),
    supabase.from("disputes").select("id, status"),
    supabase.from("memberships").select("organization_id, organizations!inner(type)").eq("user_id", userId).eq("organizations.type", "broker"),
  ]);

  // RLS already scopes `contracts` above to "everything a platform admin
  // can see" (i.e. everything) vs. "everything this specific corredor/
  // arrendador/arrendatario can see" — no separate admin-only query needed
  // for the platform-wide totals, only for isolating what belongs to a
  // corredor's own delegated properties specifically.
  const totalComisionGuardanza = isPlatformAdmin
    ? (contracts ?? []).reduce((sum, c) => sum + Number(c.comision_guardanza_monto ?? 0), 0)
    : 0;

  const brokerOrgIds = (brokerMemberships ?? []).map((m) => m.organization_id);
  const { data: brokerContracts } =
    brokerOrgIds.length > 0
      ? await supabase
          .from("contracts")
          .select("comision_corredor_monto, properties!inner(broker_organization_id)")
          .not("comision_corredor_monto", "is", null)
          .in("properties.broker_organization_id", brokerOrgIds)
      : { data: [] };
  const totalComisionCorredor = (brokerContracts ?? []).reduce((sum, c) => sum + Number(c.comision_corredor_monto ?? 0), 0);

  const custodyByCurrency = new Map<string, { count: number; amount: number }>();
  for (const g of guarantees ?? []) {
    if (g.status === "en_custodia" || g.status === "pagada" || g.status === "en_liquidacion") {
      const prev = custodyByCurrency.get(g.currency) ?? { count: 0, amount: 0 };
      custodyByCurrency.set(g.currency, { count: prev.count + 1, amount: prev.amount + Number(g.amount) });
    }
  }

  const activeContracts = (contracts ?? []).filter((c) => c.status === "activo").length;
  const openDisputes = (disputes ?? []).filter((d) => d.status === "abierta" || d.status === "negociando" || d.status === "escalada");

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={Landmark} label="Garantías en custodia">
          {custodyByCurrency.size > 0 ? (
            <div className="space-y-0.5">
              {[...custodyByCurrency.entries()].map(([currency, { count, amount }]) => (
                <p key={currency} className="text-xl font-bold text-white tabular-nums">
                  {formatAmount(amount, currency)}
                  <span className="ml-1.5 text-xs font-normal text-white/85">
                    ({count} {count === 1 ? "garantía" : "garantías"})
                  </span>
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xl font-bold text-white">—</p>
          )}
        </StatCard>

        <StatCard icon={FileText} label="Contratos activos">
          <p className="text-xl font-bold text-white tabular-nums">{activeContracts}</p>
        </StatCard>

        <StatCard icon={AlertTriangle} label="Acuerdos pendientes">
          <p className="text-xl font-bold text-white tabular-nums">{openDisputes.length}</p>
        </StatCard>
      </div>

      {(isPlatformAdmin || brokerOrgIds.length > 0) && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {isPlatformAdmin && (
            <StatCard icon={ShieldCheck} label="Comisiones Guardanza acumuladas (todo el sistema)">
              <p className="text-xl font-bold text-white tabular-nums">{formatAmount(totalComisionGuardanza, "CLP")}</p>
            </StatCard>
          )}
          {brokerOrgIds.length > 0 && (
            <StatCard icon={Percent} label="Mis comisiones acumuladas (corredor)">
              <p className="text-xl font-bold text-white tabular-nums">{formatAmount(totalComisionCorredor, "CLP")}</p>
            </StatCard>
          )}
        </div>
      )}
    </>
  );
}

async function DashboardDetails({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [{ data: contracts }, { data: disputes }, pendingEvaluations] = await Promise.all([
    supabase.from("contracts").select("id, status, end_date, properties(address)").order("end_date", { ascending: true }),
    supabase.from("disputes").select("id, status"),
    getPendingCandidateEvaluations(supabase, userId),
  ]);

  const contractsByStatus = new Map<string, number>();
  for (const c of contracts ?? []) {
    contractsByStatus.set(c.status, (contractsByStatus.get(c.status) ?? 0) + 1);
  }

  const openDisputes = (disputes ?? []).filter((d) => d.status === "abierta" || d.status === "negociando" || d.status === "escalada");

  const today = new Date();
  const in60days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  const upcomingEndings = (contracts ?? [])
    .filter((c) => c.status === "activo" && c.end_date && new Date(c.end_date) <= in60days && new Date(c.end_date) >= today)
    .slice(0, 5);

  const contractStatusOrder: { key: string; label: string }[] = [
    { key: "pendiente_firma_arrendador", label: "Pendiente firma arrendador" },
    { key: "pendiente_firma_arrendatario", label: "Pendiente firma arrendatario" },
    { key: "pendiente_deposito", label: "Pendiente de depósito" },
    { key: "activo", label: "Activos" },
    { key: "propuesta_termino", label: "Propuesta de término" },
    { key: "en_disputa", label: "En disputa" },
    { key: "finalizado", label: "Finalizados" },
    { key: "cancelado", label: "Cancelados" },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GreenCard className="p-0">
          <div className="border-b border-white/12 px-4 py-3">
            <h2 className="text-sm font-bold text-white">Contratos por estado</h2>
          </div>
          <div className="space-y-2.5 p-4">
            {contractStatusOrder.map(({ key, label }) => {
              const count = contractsByStatus.get(key) ?? 0;
              const total = contracts?.length || 1;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-xs text-white">{label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-white" style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                  <span className="w-5 shrink-0 text-right text-xs font-bold text-white tabular-nums">{count}</span>
                </div>
              );
            })}
            {(!contracts || contracts.length === 0) && <p className="text-sm text-white">Sin contratos todavía.</p>}
          </div>
        </GreenCard>

        <GreenCard className="p-0">
          <div className="flex items-center gap-1.5 border-b border-white/12 px-4 py-3">
            <CalendarClock className="size-3.5 text-white" strokeWidth={2} />
            <h2 className="text-sm font-bold text-white">Vencen en los próximos 60 días</h2>
          </div>
          {upcomingEndings.length > 0 ? (
            <StaggerGroup as="div" className="divide-y divide-white/12">
              {upcomingEndings.map((c) => (
                <StaggerItem as="div" key={c.id}>
                  <Link href={`/contracts/${c.id}`} className="flex items-center justify-between px-4 py-2.5 text-sm text-white hover:bg-white/10">
                    <span className="truncate">{one(c.properties)?.address ?? c.id}</span>
                    <span className="shrink-0 text-xs text-white tabular-nums">{new Date(c.end_date!).toLocaleDateString("es-CL")}</span>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerGroup>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-white">Nada por vencer pronto.</p>
          )}
        </GreenCard>
      </div>

      {/* Lo mismo que la campanita del header (misma consulta,
          getPendingCandidateEvaluations) — acá con más espacio para el
          detalle de cada una, en vez de solo el conteo. */}
      {pendingEvaluations.length > 0 && (
        <GreenCard className="mt-6 p-0">
          <div className="flex items-center gap-1.5 border-b border-white/12 px-4 py-3">
            <ClipboardList className="size-3.5 text-white" strokeWidth={2} />
            <h2 className="text-sm font-bold text-white">Evaluaciones</h2>
          </div>
          <StaggerGroup as="div" className="divide-y divide-white/12">
            {pendingEvaluations.map((ev) => (
              <StaggerItem as="div" key={ev.id}>
                <Link href={`/evaluacion/postulacion/${ev.id}`} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-white/10">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">{participantInviteTitle(ev.participantType)}</p>
                    <p className="truncate text-xs text-white">{ev.propertyAddress}</p>
                  </div>
                  <StatusBadge status="en_progreso" label="En progreso" />
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </GreenCard>
      )}

      {openDisputes.length > 0 && (
        <GreenCard className="mt-6 p-0">
          <div className="border-b border-white/12 px-4 py-3">
            <h2 className="text-sm font-bold text-white">Acuerdos pendientes</h2>
          </div>
          <StaggerGroup as="div" className="divide-y divide-white/12">
            {openDisputes.map((d) => (
              <StaggerItem as="div" key={d.id}>
                <Link href={`/disputes/${d.id}`} className="flex items-center justify-between px-4 py-2.5 text-sm text-white hover:bg-white/10">
                  <span>Disputa {d.id.slice(0, 8)}</span>
                  <StatusBadge status={d.status} />
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </GreenCard>
      )}
    </>
  );
}
