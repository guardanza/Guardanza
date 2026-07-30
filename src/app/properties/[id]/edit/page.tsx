import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  updateProperty,
  addPropertyTenant,
  removePropertyTenant,
  addPropertyLandlord,
  removePropertyLandlord,
} from "@/lib/actions/properties";
import { one } from "@/lib/supabase/one";
import { stripParticularSuffix } from "@/lib/labels";
import { getRegionsWithCommunes } from "@/lib/supabase/regions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RegionCommuneSelect } from "@/components/region-commune-select";
import { PropertyPhotoField } from "@/components/property-photo-field";
import { MoneyAmountInput } from "@/components/money-amount-input";

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

  const { data: landlords } = await supabase
    .from("property_landlords")
    .select("id, organizations(id, name)")
    .eq("property_id", id);
  // Exclude both whatever's already in property_landlords AND
  // property.organization_id explicitly — belt-and-suspenders so the
  // current owner can never be offered to themselves as a "new"
  // copropietario, even if organization_id was just changed above (in the
  // same page, before property_landlords catches up) or a row is missing.
  const excludedOrgIds = new Set(
    [property.organization_id, ...(landlords ?? []).map((l) => one(l.organizations)?.id)].filter(Boolean)
  );
  // Buscador por nombre/email/RUT es la próxima tanda — por ahora, agregar
  // un copropietario es elegir entre tus propias membresías admin, mismo
  // límite que ya tiene el select de "Arrendador" arriba.
  const landlordCandidateOptions = orgOptions.filter((o) => !excludedOrgIds.has(o.id));

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
            <PropertyPhotoField photoUrl={property.photo_url} />
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
                    {stripParticularSuffix(o.name)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="broker_org_code">Código de corredora (opcional, deja vacío para no cambiar)</Label>
              <Input id="broker_org_code" name="broker_org_code" placeholder="Ej: 384021" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="listing_url">Link externo (opcional)</Label>
              <Input id="listing_url" name="listing_url" type="text" placeholder="portalinmobiliario.cl/..." defaultValue={property.listing_url ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Arriendo mensual esperado (opcional)</Label>
              <MoneyAmountInput
                amountName="expected_rent_amount"
                currencyName="expected_rent_currency"
                defaultAmount={property.expected_rent_amount}
                defaultCurrency={(property.expected_rent_currency as "CLP" | "UF" | null) ?? "CLP"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expected_term_months">Plazo de arriendo esperado (meses, opcional)</Label>
              <Input
                id="expected_term_months"
                name="expected_term_months"
                type="number"
                min="1"
                step="1"
                defaultValue={property.expected_term_months ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Garantía esperada (opcional)</Label>
              <MoneyAmountInput
                amountName="expected_guarantee_amount"
                currencyName="expected_guarantee_currency"
                defaultAmount={property.expected_guarantee_amount}
                defaultCurrency={(property.expected_guarantee_currency as "CLP" | "UF" | null) ?? "CLP"}
              />
            </div>

            <Button type="submit" className="w-full">
              Guardar cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Copropietarios</CardTitle>
          <CardDescription>
            El contacto original ({stripParticularSuffix(orgOptions.find((o) => o.id === property.organization_id)?.name ?? "—")}) sigue
            siendo quien administra la propiedad. Los demás copropietarios solo figuran acá.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {landlords && landlords.length > 0 ? (
            <ul className="space-y-1.5">
              {landlords.map((l) => {
                const org = one(l.organizations);
                return (
                  <li key={l.id} className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm">
                    <span>{org ? stripParticularSuffix(org.name) : "—"}</span>
                    <form action={removePropertyLandlord}>
                      <input type="hidden" name="id" value={l.id} />
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
            <p className="text-sm text-muted-foreground">Sin copropietarios todavía.</p>
          )}
          {landlordCandidateOptions.length > 0 && (
            <form action={addPropertyLandlord} className="flex gap-2">
              <input type="hidden" name="property_id" value={id} />
              <select name="organization_id" required className={`${selectClass} flex-1`} defaultValue="">
                <option value="" disabled>
                  Selecciona un contacto
                </option>
                {landlordCandidateOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {stripParticularSuffix(o.name)}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline" size="sm">
                Agregar
              </Button>
            </form>
          )}
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
