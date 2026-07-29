import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signContractLandlord, signContractTenant, cancelContract, payGuarantee } from "@/lib/actions/contracts";
import { openDispute } from "@/lib/actions/disputes";
import { one } from "@/lib/supabase/one";
import { hasCompletedProfile } from "@/lib/profile-completeness";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Separator } from "@/components/ui/separator";
import { RequireRutPrompt } from "@/components/require-rut-prompt";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  // Refactor Paso 1: reads estado_firma/estado_garantia from
  // contracts_branch_status instead of branching on the combined
  // contracts.status directly — see 20260728120001. contract.status
  // itself is still present (the view passes through every column) and
  // stays in use for the header badge, where the finer detail is useful
  // rather than a maintenance burden.
  const { data: contract, error } = await supabase.from("contracts_branch_status").select("*, properties(address)").eq("id", id).single();
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

  const { data: profile } = await supabase.from("profiles").select("rut").eq("id", userRes.user.id).single();
  const needsSignature =
    (contract.estado_firma === "esperando_firmas" && myRole === "arrendador") ||
    (contract.estado_firma === "firmado_parcialmente" && myRole === "arrendatario");
  const blockedBySignature = needsSignature && !hasCompletedProfile(profile);
  // The one check that genuinely spans both branches: still signing, OR
  // signed but the deposit hasn't been paid yet. Enumerated explicitly
  // rather than negating "not firmado_por_todos" — that form would also
  // match estado_firma === "cancelado" and re-show the button on an
  // already-cancelled contract.
  const isCancellable =
    contract.estado_firma === "esperando_firmas" ||
    contract.estado_firma === "firmado_parcialmente" ||
    contract.estado_garantia === "pendiente";

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

      {blockedBySignature && <RequireRutPrompt returnTo={`/contracts/${id}`} />}

      <div className="flex flex-wrap gap-2">
        {contract.estado_firma === "esperando_firmas" && myRole === "arrendador" && !blockedBySignature && (
          <form action={signLandlordAction}>
            <Button type="submit">Firmar como arrendador (mock)</Button>
          </form>
        )}

        {contract.estado_firma === "firmado_parcialmente" && myRole === "arrendatario" && !blockedBySignature && (
          <form action={signTenantAction}>
            <Button type="submit">Firmar como arrendatario (mock)</Button>
          </form>
        )}

        {contract.estado_garantia === "pendiente" && myRole === "arrendatario" && payAction && (
          <form action={payAction}>
            <Button type="submit">Pagar garantía (simulado)</Button>
          </form>
        )}

        {isCancellable && (myRole === "arrendador" || myRole === "arrendatario") && (
          <form action={cancelAction}>
            <Button type="submit" variant="outline">
              Cancelar contrato
            </Button>
          </form>
        )}

        {contract.estado_garantia === "en_custodia" && guarantee && myRole === "arrendador" && (
          <form action={openDispute}>
            <input type="hidden" name="guarantee_id" value={guarantee.id} />
            <input type="hidden" name="contract_id" value={id} />
            <Button type="submit" variant="outline">
              Proponer descuentos
            </Button>
          </form>
        )}
      </div>

      {/* "Hay una propuesta pendiente" specifically means propuesta abierta,
          not yet escalated — that distinction lives in disputes.status, not
          in estado_garantia (which only knows "en_revision", either kind). */}
      {disputes?.some((d) => d.status === "abierta") && (
        <p className="text-sm text-muted-foreground">
          Hay una propuesta de descuento pendiente — revísala abajo para aceptarla o rechazarla.
        </p>
      )}

      <Separator />

      <div className="space-y-3">
        <h2 className="font-medium">Propuestas de descuento</h2>
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
            <CardContent className="py-6 text-center text-sm text-muted-foreground">Sin propuestas de descuento.</CardContent>
          )}
        </Card>
      </div>

      <Link href={`/history?contract_id=${id}`} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        Ver historial de acciones de este contrato
      </Link>
    </div>
  );
}
