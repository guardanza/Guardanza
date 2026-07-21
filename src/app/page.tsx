import Link from "next/link";
import { Landmark, FileText, AlertTriangle, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { MarketingHome } from "@/components/marketing-home";

function formatAmount(amount: number, currency: string) {
  if (currency === "UF") return `UF ${amount.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${Math.round(amount).toLocaleString("es-CL")}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return <MarketingHome />;

  const [{ data: contracts }, { data: guarantees }, { data: disputes }] = await Promise.all([
    supabase.from("contracts").select("id, status, end_date, properties(address)").order("end_date", { ascending: true }),
    supabase.from("guarantees").select("status, amount, currency"),
    supabase.from("disputes").select("id, status"),
  ]);

  const custodyByCurrency = new Map<string, { count: number; amount: number }>();
  for (const g of guarantees ?? []) {
    if (g.status === "en_custodia" || g.status === "pagada" || g.status === "en_liquidacion") {
      const prev = custodyByCurrency.get(g.currency) ?? { count: 0, amount: 0 };
      custodyByCurrency.set(g.currency, { count: prev.count + 1, amount: prev.amount + Number(g.amount) });
    }
  }

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
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Estado general de tus garantías y contratos.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Landmark className="size-3.5" strokeWidth={2} />
              Garantías en custodia
            </div>
            {custodyByCurrency.size > 0 ? (
              <div className="space-y-0.5">
                {[...custodyByCurrency.entries()].map(([currency, { count, amount }]) => (
                  <p key={currency} className="text-xl font-semibold tabular-nums">
                    {formatAmount(amount, currency)}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      ({count} {count === 1 ? "garantía" : "garantías"})
                    </span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xl font-semibold text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <FileText className="size-3.5" strokeWidth={2} />
              Contratos activos
            </div>
            <p className="text-xl font-semibold tabular-nums">{contractsByStatus.get("activo") ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <AlertTriangle className="size-3.5" strokeWidth={2} />
              Acuerdos pendientes
            </div>
            <p className="text-xl font-semibold tabular-nums">{openDisputes.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-0">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">Contratos por estado</h2>
          </div>
          <CardContent className="space-y-2.5 py-4">
            {contractStatusOrder.map(({ key, label }) => {
              const count = contractsByStatus.get(key) ?? 0;
              const total = contracts?.length || 1;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-xs text-muted-foreground">{label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                  <span className="w-5 shrink-0 text-right text-xs font-medium tabular-nums">{count}</span>
                </div>
              );
            })}
            {(!contracts || contracts.length === 0) && <p className="text-sm text-muted-foreground">Sin contratos todavía.</p>}
          </CardContent>
        </Card>

        <Card className="p-0">
          <div className="flex items-center gap-1.5 border-b px-4 py-3">
            <CalendarClock className="size-3.5 text-muted-foreground" strokeWidth={2} />
            <h2 className="text-sm font-medium">Vencen en los próximos 60 días</h2>
          </div>
          {upcomingEndings.length > 0 ? (
            <div className="divide-y">
              {upcomingEndings.map((c) => (
                <Link key={c.id} href={`/contracts/${c.id}`} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/50">
                  <span className="truncate">{one(c.properties)?.address ?? c.id}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {new Date(c.end_date!).toLocaleDateString("es-CL")}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <CardContent className="py-8 text-center text-sm text-muted-foreground">Nada por vencer pronto.</CardContent>
          )}
        </Card>
      </div>

      {openDisputes.length > 0 && (
        <Card className="p-0">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">Acuerdos pendientes</h2>
          </div>
          <div className="divide-y">
            {openDisputes.map((d) => (
              <Link key={d.id} href={`/disputes/${d.id}`} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/50">
                <span>Disputa {d.id.slice(0, 8)}</span>
                <StatusBadge status={d.status} />
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
