import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateProperty, addPropertyTenant, removePropertyTenant } from "@/lib/actions/properties";
import { getRegionsWithCommunes } from "@/lib/supabase/regions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PropertyThumb } from "@/components/property-thumb";
import { RegionCommuneSelect } from "@/components/region-commune-select";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function EditPropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: property, error: fetchError } = await supabase.from("properties").select("*").eq("id", id).single();
  if (fetchError || !property) notFound();

  const regions = await getRegionsWithCommunes(supabase);

  const { data: memberships } = await supabase.from("memberships").select("role, organizations(id, name)").eq("role", "admin");
  const orgOptions = (memberships ?? [])
    .map((m) => (Array.isArray(m.organizations) ? m.organizations[0] : m.organizations))
    .filter((o): o is { id: string; name: string } => !!o);

  const { data: tenants } = await supabase
    .from("property_tenants")
    .select("id, profiles(full_name)")
    .eq("property_id", id);

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6 md:px-6 md:py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Editar propiedad</CardTitle>
          <CardDescription>{property.address}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProperty} className="space-y-3">
            <input type="hidden" name="id" value={id} />
            <PropertyThumb url={property.photo_url} className="h-32 w-full rounded-lg" />
            <div className="space-y-1.5">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" name="address" defaultValue={property.address} required />
            </div>
            <RegionCommuneSelect regions={regions} defaultCommuneId={property.commune_id} />
            <div className="space-y-1.5">
              <Label htmlFor="organization_id">Arrendador</Label>
              <select id="organization_id" name="organization_id" className={selectClass} defaultValue={property.organization_id}>
                {orgOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="broker_org_code">Código de corredora (opcional, deja vacío para no cambiar)</Label>
              <Input id="broker_org_code" name="broker_org_code" placeholder="Ej: 384021" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="photo">Reemplazar foto (opcional)</Label>
              <Input id="photo" name="photo" type="file" accept="image/*" className="p-1.5" />
            </div>
            <Button type="submit" className="w-full">
              Guardar cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Arrendatarios vinculados</CardTitle>
          <CardDescription>Interesados en esta propiedad, con o sin contrato todavía.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tenants && tenants.length > 0 ? (
            <ul className="space-y-1.5">
              {tenants.map((t) => {
                const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
                return (
                  <li key={t.id} className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm">
                    <span>{profile?.full_name ?? "—"}</span>
                    <form action={removePropertyTenant}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="property_id" value={id} />
                      <button type="submit" className="text-muted-foreground hover:text-destructive">
                        <X className="size-4" />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Sin arrendatarios vinculados todavía.</p>
          )}
          <form action={addPropertyTenant} className="flex gap-2">
            <input type="hidden" name="property_id" value={id} />
            <Input name="tenant_email" type="email" placeholder="email@ejemplo.cl" required className="flex-1" />
            <Button type="submit" variant="outline" size="sm">
              Vincular
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
