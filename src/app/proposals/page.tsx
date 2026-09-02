import Link from "next/link";
import { redirect } from "next/navigation";
import { Handshake, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { GreenCard, GreenEmptyState } from "@/components/ui/green-card";

type Guarantee = { contracts: { properties: { address: string } | { address: string }[] } | { properties: { address: string } | { address: string }[] }[] };

export default async function ProposalsPage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: disputes, error } = await supabase
    .from("disputes")
    .select("id, status, created_at, guarantees(contracts(properties(address)))")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Propuestas de descuento</h1>
          <p className="text-sm text-muted-foreground">Acuerdos entre arrendador, arrendatario y corredor al término de un contrato.</p>
        </div>
        <Link href="/proposals/catalog" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ClipboardList /> Catálogo de reparaciones
        </Link>
      </div>

      {disputes && disputes.length > 0 ? (
        <div className="space-y-3">
          {disputes.map((d) => {
            const guarantee = one(d.guarantees as unknown as Guarantee | Guarantee[]);
            const contract = guarantee ? one(guarantee.contracts) : null;
            const property = contract ? one(contract.properties) : null;
            return (
              <Link key={d.id} href={`/disputes/${d.id}`}>
                <GreenCard className="flex items-center justify-between p-3.5 transition-shadow hover:shadow-[0_4px_16px_rgba(20,67,47,0.26)]">
                  <span className="text-sm font-bold text-white">{property?.address ?? `Propuesta ${d.id.slice(0, 8)}`}</span>
                  <StatusBadge status={d.status} />
                </GreenCard>
              </Link>
            );
          })}
        </div>
      ) : (
        <GreenEmptyState icon={Handshake} message="Sin propuestas de descuento todavía." />
      )}
    </div>
  );
}
