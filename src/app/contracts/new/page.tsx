import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasCompletedProfile } from "@/lib/profile-completeness";
import { createContract } from "@/lib/actions/contracts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RequireRutPrompt } from "@/components/require-rut-prompt";

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ property_id?: string; error?: string }>;
}) {
  const { property_id, error } = await searchParams;

  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("rut").eq("id", userRes.user.id).single();
  const returnTo = `/contracts/new${property_id ? `?property_id=${property_id}` : ""}`;

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
          <CardDescription>Queda pendiente de firma del arrendador — se envía a firmar después de crearlo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createContract} className="space-y-4">
            <input type="hidden" name="property_id" defaultValue={property_id} />

            <div className="space-y-1.5">
              <Label htmlFor="tenant_email">Arrendatario (email, debe tener cuenta ya creada)</Label>
              <Input id="tenant_email" name="tenant_email" type="email" required />
            </div>

            <div className="space-y-1.5">
              <Label>Vigencia</Label>
              <div className="flex gap-2">
                <Input name="start_date" type="date" required />
                <Input name="end_date" type="date" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Renta</Label>
              <div className="flex gap-2">
                <Input name="rent_amount" type="number" step="0.01" required />
                <select name="rent_currency" required className={selectClass} defaultValue="CLP">
                  <option value="CLP">CLP</option>
                  <option value="UF">UF</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Garantía</Label>
              <div className="flex gap-2">
                <Input name="guarantee_amount" type="number" step="0.01" required />
                <select name="guarantee_currency" required className={selectClass} defaultValue="CLP">
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
