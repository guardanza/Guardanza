import { redirect } from "next/navigation";
import { createProperty } from "@/lib/actions/properties";
import { createClient } from "@/lib/supabase/server";
import { stripParticularSuffix } from "@/lib/labels";
import { getRegionsWithCommunes } from "@/lib/supabase/regions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RegionCommuneSelect } from "@/components/region-commune-select";

export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ organization_id?: string; error?: string }>;
}) {
  const { organization_id, error } = await searchParams;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const regions = await getRegionsWithCommunes(supabase);

  let orgOptions: { id: string; name: string }[] = [];
  if (!organization_id) {
    const { data: memberships } = await supabase
      .from("memberships")
      .select("role, organizations(id, name)")
      .eq("role", "admin");
    orgOptions = (memberships ?? [])
      .map((m) => (Array.isArray(m.organizations) ? m.organizations[0] : m.organizations))
      .filter((o): o is { id: string; name: string } => !!o);
  }

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6 md:px-6 md:py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Nueva propiedad</CardTitle>
          <CardDescription>
            Guarda lo básico ahora — foto, arriendo, garantía, arrendadores y corredor se completan después, sin perder nada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createProperty} className="space-y-3">
            {organization_id ? (
              // Arrived from a specific organización's "+ Nueva propiedad" —
              // no ambiguity, no field to show at all.
              <input type="hidden" name="organization_id" defaultValue={organization_id} />
            ) : orgOptions.length === 1 ? (
              // The common case: exactly one organización to be. Preselected,
              // invisible — nothing to decide, so nothing shown.
              <input type="hidden" name="organization_id" defaultValue={orgOptions[0].id} />
            ) : (
              // Multiple organizaciones (e.g. a corredor with several) — still
              // preselected to the first so the common path never blocks
              // on a choice, but shown small and inline (not a full field)
              // since it's the exception, not the decision every user faces.
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Arrendador:</span>
                <select
                  name="organization_id"
                  required
                  defaultValue={orgOptions[0]?.id ?? ""}
                  className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {orgOptions.length === 0 && <option value="">No administras ninguna organización todavía</option>}
                  {orgOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {stripParticularSuffix(o.name)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" name="address" required />
            </div>
            <RegionCommuneSelect regions={regions} />
            <Button type="submit" className="w-full">
              Crear y continuar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
