import { redirect } from "next/navigation";
import { createProperty } from "@/lib/actions/properties";
import { createClient } from "@/lib/supabase/server";
import { getRegionsWithCommunes } from "@/lib/supabase/regions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RegionCommuneSelect } from "@/components/region-commune-select";
import { WizardSteps } from "@/components/wizard-steps";

// Pantalla A del Paso 1 del wizard de alta de propiedad. organization_id
// nunca se le pide a elegir a la persona — es quien administra la ficha
// (siempre la propia organización del usuario, "una cuenta administra
// como mucho una organización" ya lo garantiza), nunca el arrendador real
// — ese se resuelve en la pantalla B (/properties/[id]/edit, Paso 1),
// vía el buscador de arrendadores.
export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ organization_id?: string; error?: string }>;
}) {
  const { organization_id: organizationIdParam, error } = await searchParams;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const regions = await getRegionsWithCommunes(supabase);

  let organizationId = organizationIdParam ?? null;
  if (!organizationId) {
    const { data: membership } = await supabase.from("memberships").select("organization_id").eq("role", "admin").maybeSingle();
    organizationId = membership?.organization_id ?? null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 md:px-6 md:py-10">
      <WizardSteps current={1} />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Nueva propiedad</CardTitle>
          <CardDescription>Dirección y ubicación — el resto se completa en los pasos siguientes.</CardDescription>
        </CardHeader>
        <CardContent>
          {organizationId ? (
            <form action={createProperty} className="space-y-3">
              <input type="hidden" name="organization_id" value={organizationId} />
              <div className="space-y-1.5">
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" name="address" required />
              </div>
              <RegionCommuneSelect regions={regions} />
              <Button type="submit" className="w-full">
                Continuar
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Necesitas administrar una organización para crear propiedades.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
