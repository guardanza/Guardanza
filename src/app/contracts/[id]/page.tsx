import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signContractLandlord, signContractTenant, cancelContract, payGuarantee } from "@/lib/actions/contracts";
import { openDispute } from "@/lib/actions/disputes";
import { one } from "@/lib/supabase/one";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Separator } from "@/components/ui/separator";

const CANCELLABLE_STATUSES = ["pendiente_firma_arrendador", "pendiente_firma_arrendatario", "pendiente_deposito"];

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

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

  const { data: interestAccrued } = contract.deposit_confirmed_at
    ? await supabase.rpc("contract_interest_accrued", { p_contract_id: id })
    : { data: null };

  const { data: disputes } = guarantee
    ? await supabase.from("disputes").select("id, status, created_at").eq("guarantee_id", guarantee.id)
    : { data: [] };

  const { data: myParty } = await supabase
    .from("contract_parties")
    .select("role")
    .eq("contract_id", id)
    .eq("user_id", userRes.user.id)
    .maybeSingle();
  const myRole = myParty?.role;

  const signLandlordAction = signContractLandlord.bind(null, id);
  const signTenantAction = signContractTenant.bind(null, id);
  const cancelAction = cancelContract.bind(null, id);
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

      {contract.deposit_confirmed_at && (
        <Card>
          <CardHeader>
            <CardTitle>Dinero custodiado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Intereses acumulados hasta hoy</span>
              <span className="font-medium tabular-nums">
                {interestAccrued ?? 0} {contract.guarantee_currency}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Comisión Guardanza</span>
              <span className="font-medium tabular-nums">
                {contract.comision_guardanza_monto} {contract.guarantee_currency}
              </span>
            </div>
            {contract.comision_corredor_monto > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Comisión corredor</span>
                <span className="font-medium tabular-nums">
                  {contract.comision_corredor_monto} {contract.guarantee_currency}
                </span>
              </div>
            )}
            <p className="pt-1 text-xs text-muted-foreground">Referencia de depósito: {contract.deposit_bank_tx_id}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {contract.status === "pendiente_firma_arrendador" && myRole === "arrendador" && (
          <form action={signLandlordAction}>
            <Button type="submit">Firmar como arrendador (mock)</Button>
          </form>
        )}

        {contract.status === "pendiente_firma_arrendatario" && myRole === "arrendatario" && (
          <form action={signTenantAction}>
            <Button type="submit">Firmar como arrendatario (mock)</Button>
          </form>
        )}

        {contract.status === "pendiente_deposito" && myRole === "arrendatario" && payAction && (
          <form action={payAction}>
            <Button type="submit">Pagar garantía (simulado)</Button>
          </form>
        )}

        {CANCELLABLE_STATUSES.includes(contract.status) && (myRole === "arrendador" || myRole === "arrendatario") && (
          <form action={cancelAction}>
            <Button type="submit" variant="outline">
              Cancelar contrato
            </Button>
          </form>
        )}

        {contract.status === "activo" && guarantee && myRole === "arrendador" && (
          <form action={openDispute}>
            <input type="hidden" name="guarantee_id" value={guarantee.id} />
            <input type="hidden" name="contract_id" value={id} />
            <Button type="submit" variant="outline">
              Proponer descuentos
            </Button>
          </form>
        )}
      </div>

      {contract.status === "propuesta_termino" && (
        <p className="text-sm text-muted-foreground">
          Hay una propuesta de arreglo pendiente — revísala abajo para aceptarla o rechazarla.
        </p>
      )}

      <Separator />

      <div className="space-y-3">
        <h2 className="font-medium">Propuestas de arreglo</h2>
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
            <CardContent className="py-6 text-center text-sm text-muted-foreground">Sin propuestas de arreglo.</CardContent>
          )}
        </Card>
      </div>

      <Link href={`/history?contract_id=${id}`} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        Ver historial de acciones de este contrato
      </Link>
    </div>
  );
}
