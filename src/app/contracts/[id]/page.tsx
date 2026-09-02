import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signContractLandlord, signContractTenant, cancelContract, payGuarantee } from "@/lib/actions/contracts";
import { undoWinningCandidate } from "@/lib/actions/candidates";
import { openDispute } from "@/lib/actions/disputes";
import { one } from "@/lib/supabase/one";
import { hasCompletedProfile } from "@/lib/profile-completeness";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Separator } from "@/components/ui/separator";
import { SectionTitle } from "@/components/ui/section-title";
import { GreenCard } from "@/components/ui/green-card";
import { GreenInfoBox, GreenInfoRow } from "@/components/ui/green-info-box";
import { RequireRutPrompt } from "@/components/require-rut-prompt";
import { UndoAdjudicationSheet } from "@/components/undo-adjudication-sheet";
import { CancelContractSheet } from "@/components/cancel-contract-sheet";

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
  const { data: contract, error } = await supabase.from("contracts_branch_status").select("*, properties(id, address)").eq("id", id).single();
  if (error || !contract) notFound();
  const property = one(contract.properties);

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

  // "Deshacer adjudicación" solo mientras nadie firmó — a diferencia de
  // "Cancelar contrato" (isCancellable), que sigue disponible incluso
  // después de la primera firma. Nunca se lo ofrece al arrendatario: la
  // autorización real de undo_winning_candidate() es admin de la
  // organización dueña o de la corredora, nunca quien arrienda.
  const canUndo = contract.estado_firma === "esperando_firmas" && (myRole === "arrendador" || myRole === "corredor");
  const { data: tenantParty } = canUndo
    ? await supabase.from("contract_parties").select("profiles(full_name)").eq("contract_id", id).eq("role", "arrendatario").maybeSingle()
    : { data: null };
  const tenantName = tenantParty ? (one(tenantParty.profiles)?.full_name ?? "el arrendatario") : "el arrendatario";

  const signLandlordAction = signContractLandlord.bind(null, id);
  const signTenantAction = signContractTenant.bind(null, id);
  const cancelAction = cancelContract.bind(null, id);
  const payAction = guarantee ? payGuarantee.bind(null, guarantee.id, id) : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{property?.address}</h1>
        <StatusBadge status={contract.status} />
      </div>

      <GreenInfoBox title="Garantía">
        <div className="pb-2">
          {amounts ? (
            <>
              <p className="text-lg font-bold text-white">
                {amounts.amount_chosen} {amounts.currency_chosen}
                <span className="ml-1.5 text-sm font-normal text-white">moneda elegida</span>
              </p>
              <p className="text-xs text-white">
                {amounts.is_frozen
                  ? `Equivalente: ${amounts.amount_other} ${amounts.currency_other} — convertido a la UF del día de firma (${amounts.uf_rate_at_signing})`
                  : "Equivalente en la otra moneda se calculará al firmar el contrato."}
              </p>
            </>
          ) : (
            <p className="text-sm text-white">—</p>
          )}
        </div>
        {guarantee && (
          <div className="flex items-center gap-2 pt-2 text-sm">
            <span className="text-white">Estado de la garantía:</span>
            <StatusBadge status={guarantee.status} />
          </div>
        )}
      </GreenInfoBox>

      {contract.deposit_confirmed_at && (
        <GreenInfoBox title="Dinero custodiado">
          <GreenInfoRow label="Intereses acumulados hasta hoy" value={`${interestAccrued ?? 0} ${contract.guarantee_currency}`} />
          <GreenInfoRow label="Comisión Guardanza" value={`${contract.comision_guardanza_monto} ${contract.guarantee_currency}`} />
          {contract.comision_corredor_monto > 0 && (
            <GreenInfoRow label="Comisión corredor" value={`${contract.comision_corredor_monto} ${contract.guarantee_currency}`} />
          )}
          <p className="pt-2 text-xs text-white">Referencia de depósito: {contract.deposit_bank_tx_id}</p>
        </GreenInfoBox>
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

        {isCancellable && (myRole === "arrendador" || myRole === "arrendatario") && <CancelContractSheet action={cancelAction} />}

        {canUndo && property && (
          <UndoAdjudicationSheet action={undoWinningCandidate} contractId={id} propertyId={property.id} tenantName={tenantName} />
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
        <SectionTitle>Propuestas de descuento</SectionTitle>
        <GreenCard className="p-0">
          {disputes && disputes.length > 0 ? (
            <ul className="divide-y divide-white/12">
              {disputes.map((d) => (
                <li key={d.id} className="flex items-center justify-between p-3">
                  <Link href={`/disputes/${d.id}`} className="text-sm text-white underline-offset-4 hover:underline">
                    {d.id}
                  </Link>
                  <StatusBadge status={d.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-white">Sin propuestas de descuento.</p>
          )}
        </GreenCard>
      </div>

      <Link href={`/history?contract_id=${id}`} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        Ver historial de acciones de este contrato
      </Link>
    </div>
  );
}
