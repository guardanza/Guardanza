import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasCompletedProfile } from "@/lib/profile-completeness";
import { one } from "@/lib/supabase/one";
import { selectWinningCandidate } from "@/lib/actions/candidates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RequireRutPrompt } from "@/components/require-rut-prompt";

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// Único punto de entrada para crear un contrato: siempre desde un
// candidato ya elegido (evaluación normal, o el atajo "Ya tengo al
// arrendatario"). El camino viejo con email libre (create_contract(),
// sin candidato detrás) se retiró — ver Opción C. Sin candidate_id no
// hay nada que mostrar acá, así que se redirige de vuelta a la
// propiedad en vez de dejar una página condenada a fallar.
export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ property_id?: string; candidate_id?: string; error?: string }>;
}) {
  const { property_id, candidate_id, error } = await searchParams;
  if (!candidate_id) redirect(property_id ? `/properties/${property_id}` : "/properties");

  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("rut").eq("id", userRes.user.id).single();
  const returnTo = `/contracts/new?property_id=${property_id ?? ""}&candidate_id=${candidate_id}`;

  // SENSIBLE: precarga renta, plazo y garantía desde los campos
  // "esperados" de la propiedad (Tanda A) — el corredor no retipea
  // nada, solo confirma o ajusta antes de crear el contrato.
  // select_winning_candidate() vuelve a validar todo esto server-side
  // (estado en_evaluacion, contacto confirmado) — este chequeo acá es
  // solo para no mostrar un formulario condenado a fallar.
  const { data: candidateRow } = await supabase
    .from("property_candidates")
    .select(
      "id, status, contacts(full_name, status), properties(expected_rent_amount, expected_rent_currency, expected_term_months, expected_guarantee_amount, expected_guarantee_currency)"
    )
    .eq("id", candidate_id)
    .single();

  const contact = candidateRow ? one(candidateRow.contacts) : null;
  if (!candidateRow || !contact) {
    redirect(`/properties/${property_id}?error=${encodeURIComponent("Este candidato ya no existe.")}`);
  }
  if (candidateRow.status !== "en_evaluacion") {
    redirect(`/properties/${property_id}?error=${encodeURIComponent("Este candidato ya no está en evaluación.")}`);
  }
  if (contact.status !== "confirmado") {
    redirect(
      `/properties/${property_id}?error=${encodeURIComponent("Este candidato todavía no confirmó su cuenta — no puede ser el arrendatario todavía.")}`
    );
  }

  const property = one(candidateRow.properties);
  const expectedRentAmount = property?.expected_rent_amount ?? null;
  const expectedRentCurrency = property?.expected_rent_currency ?? null;
  const expectedTermMonths = property?.expected_term_months ?? null;
  const expectedGuaranteeAmount = property?.expected_guarantee_amount ?? null;
  const expectedGuaranteeCurrency = property?.expected_guarantee_currency ?? null;

  const today = new Date();
  const defaultStartDate = toDateInput(today);
  const defaultEndDate = expectedTermMonths ? toDateInput(addMonths(today, expectedTermMonths)) : "";

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6 md:px-6 md:py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!hasCompletedProfile(profile) && <RequireRutPrompt returnTo={returnTo} />}

      <Card className={hasCompletedProfile(profile) ? "" : "pointer-events-none opacity-40"}>
        <CardHeader>
          <CardTitle>Nuevo contrato</CardTitle>
          <CardDescription>
            Precargado con los datos esperados de la propiedad — ajústalos si hace falta antes de crear el contrato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={selectWinningCandidate} className="space-y-4">
            <input type="hidden" name="property_id" defaultValue={property_id} />
            <input type="hidden" name="candidate_id" defaultValue={candidateRow.id} />

            <div className="space-y-1.5">
              <Label>Arrendatario</Label>
              <p className="rounded-lg border px-3 py-1.5 text-sm">{contact.full_name}</p>
            </div>

            <div className="space-y-1.5">
              <Label>Vigencia</Label>
              <div className="flex gap-2">
                <Input name="start_date" type="date" defaultValue={defaultStartDate} required />
                <Input name="end_date" type="date" defaultValue={defaultEndDate} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Renta</Label>
              <div className="flex gap-2">
                <Input name="rent_amount" type="number" step="0.01" defaultValue={expectedRentAmount ?? ""} required />
                <select name="rent_currency" required className={selectClass} defaultValue={expectedRentCurrency ?? "CLP"}>
                  <option value="CLP">CLP</option>
                  <option value="UF">UF</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Garantía</Label>
              <div className="flex gap-2">
                <Input name="guarantee_amount" type="number" step="0.01" defaultValue={expectedGuaranteeAmount ?? ""} required />
                <select name="guarantee_currency" required className={selectClass} defaultValue={expectedGuaranteeCurrency ?? "CLP"}>
                  <option value="CLP">CLP</option>
                  <option value="UF">UF</option>
                </select>
              </div>
            </div>

            <Button type="submit" className="w-full">
              Crear contrato
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
