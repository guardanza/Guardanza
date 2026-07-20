import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signContract, payGuarantee } from "@/lib/actions/contracts";
import { openDispute } from "@/lib/actions/disputes";
import { one } from "@/lib/supabase/one";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Separator } from "@/components/ui/separator";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contract, error } = await supabase.from("contracts").select("*, properties(address)").eq("id", id).single();
  if (error || !contract) notFound();

  const { data: amounts } = await supabase
    .rpc("contract_guarantee_amounts", { p_contract_id: id })
    .single<{
      currency_chosen: string;
      amount_chosen: number;
      currency_other: string;
      amount_other: number | null;
      uf_rate_at_signing: number | null;
      is_frozen: boolean;
    }>();

  const { data: guarantee } = await supabase.from("guarantees").select("*").eq("contract_id", id).single();

  const { data: disputes } = guarantee
    ? await supabase.from("disputes").select("id, status, created_at").eq("guarantee_id", guarantee.id)
    : { data: [] };

  const signAction = signContract.bind(null, id);
  const payAction = guarantee ? payGuarantee.bind(null, guarantee.id, id) : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{one(contract.properties)?.address}</h1>
        <StatusBadge status={contract.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Garantía</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {amounts ? (
            <>
              <p className="text-lg font-medium">
                {amounts.amount_chosen} {amounts.currency_chosen}
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">moneda elegida</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {amounts.is_frozen
                  ? `Equivalente: ${amounts.amount_other} ${amounts.currency_other} — convertido a la UF del día de firma (${amounts.uf_rate_at_signing})`
                  : "Equivalente en la otra moneda se calculará al firmar el contrato."}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
          {guarantee && (
            <div className="flex items-center gap-2 pt-1 text-sm">
              <span className="text-muted-foreground">Estado de la garantía:</span>
              <StatusBadge status={guarantee.status} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {contract.status === "borrador" || contract.status === "pendiente_firma" ? (
          <form action={signAction}>
            <Button type="submit">Firmar (mock)</Button>
          </form>
        ) : null}

        {guarantee?.status === "pendiente" && payAction && (
          <form action={payAction}>
            <Button type="submit">Pagar garantía (simulado)</Button>
          </form>
        )}

        {guarantee?.status === "en_custodia" && (
          <form action={openDispute}>
            <input type="hidden" name="guarantee_id" value={guarantee.id} />
            <input type="hidden" name="contract_id" value={id} />
            <Button type="submit" variant="outline">
              Abrir disputa
            </Button>
          </form>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <h2 className="font-medium">Disputas</h2>
        <Card className="p-0">
          {disputes && disputes.length > 0 ? (
            <ul className="divide-y">
              {disputes.map((d) => (
                <li key={d.id} className="flex items-center justify-between p-3">
                  <Link href={`/disputes/${d.id}`} className="text-sm underline-offset-4 hover:underline">
                    {d.id}
                  </Link>
                  <StatusBadge status={d.status} />
                </li>
              ))}
            </ul>
          ) : (
            <CardContent className="py-6 text-center text-sm text-muted-foreground">Sin disputas.</CardContent>
          )}
        </Card>
      </div>

      <Link href={`/audit?contract_id=${id}`} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        Ver audit log de este contrato
      </Link>
    </div>
  );
}
