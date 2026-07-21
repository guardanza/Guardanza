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
          <CardDescription>Se asocia al participante que la administra.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createProperty} className="space-y-3">
            {organization_id ? (
              <input type="hidden" name="organization_id" defaultValue={organization_id} />
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="organization_id">Participante</Label>
                <select
                  id="organization_id"
                  name="organization_id"
                  required
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {orgOptions.length === 0 && <option value="">No administras ningún participante todavía</option>}
                  {orgOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
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
            <div className="space-y-1.5">
              <Label htmlFor="photo">Foto (opcional)</Label>
              <Input id="photo" name="photo" type="file" accept="image/*" className="p-1.5" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="broker_org_code">Código de corredora (opcional)</Label>
              <Input id="broker_org_code" name="broker_org_code" placeholder="Ej: 384021 — te lo comparte la corredora" />
            </div>
            <Button type="submit" className="w-full">
              Crear
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
