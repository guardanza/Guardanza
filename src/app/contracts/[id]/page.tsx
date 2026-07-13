import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signContract, payGuarantee } from "@/lib/actions/contracts";
import { openDispute } from "@/lib/actions/disputes";
import { one } from "@/lib/supabase/one";

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
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-xl font-semibold">{one(contract.properties)?.address}</h1>
      <p>
        Estado: <strong>{contract.status}</strong>
      </p>

      <section className="space-y-1 border p-4">
        <h2 className="font-medium">Garantía</h2>
        {amounts ? (
          <>
            <p>
              {amounts.currency_chosen} {amounts.amount_chosen} (moneda elegida)
            </p>
            <p className="text-sm text-gray-600">
              {amounts.is_frozen
                ? `Equivalente: ${amounts.currency_other} ${amounts.amount_other} — convertido a la UF del día de firma (${amounts.uf_rate_at_signing})`
                : "Equivalente en la otra moneda se calculará al firmar el contrato."}
            </p>
          </>
        ) : (
          <p>—</p>
        )}
        {guarantee && <p>Estado de la garantía: {guarantee.status}</p>}
      </section>

      <div className="flex gap-2">
        {contract.status === "borrador" || contract.status === "pendiente_firma" ? (
          <form action={signAction}>
            <button type="submit" className="bg-black p-2 text-white">
              Firmar (mock)
            </button>
          </form>
        ) : null}

        {guarantee?.status === "pendiente" && payAction && (
          <form action={payAction}>
            <button type="submit" className="bg-black p-2 text-white">
              Pagar garantía (simulado)
            </button>
          </form>
        )}

        {guarantee?.status === "en_custodia" && (
          <form action={openDispute}>
            <input type="hidden" name="guarantee_id" value={guarantee.id} />
            <input type="hidden" name="contract_id" value={id} />
            <button type="submit" className="border border-black p-2">
              Abrir disputa
            </button>
          </form>
        )}
      </div>

      <section className="space-y-1">
        <h2 className="font-medium">Disputas</h2>
        <ul className="divide-y border">
          {disputes?.map((d) => (
            <li key={d.id} className="p-2">
              <Link href={`/disputes/${d.id}`} className="underline">
                {d.id}
              </Link>{" "}
              — {d.status}
            </li>
          ))}
          {(!disputes || disputes.length === 0) && <li className="p-2 text-sm text-gray-500">Sin disputas.</li>}
        </ul>
      </section>

      <Link href={`/audit?contract_id=${id}`} className="text-sm underline">
        Ver audit log de este contrato
      </Link>
    </div>
  );
}
