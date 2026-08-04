import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateProperty, addPropertyLandlord, removePropertyLandlord, setPropertyBroker } from "@/lib/actions/properties";
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
import { BrokerSearchField } from "@/components/broker-search-field";
import { LandlordSearchField } from "@/components/landlord-search-field";
import { PropertyDetailsForm } from "@/components/property-details-form";

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

  const { data: property, error: fetchError } = await supabase
    .from("properties")
    .select("*, broker:organizations!properties_broker_organization_id_fkey(id, name)")
    .eq("id", id)
    .single();
  if (fetchError || !property) notFound();

  const regions = await getRegionsWithCommunes(supabase);

  const { data: memberships } = await supabase.from("memberships").select("role, organizations(id, name)").eq("role", "admin");
  const orgOptions = (memberships ?? [])
    .map((m) => (Array.isArray(m.organizations) ? m.organizations[0] : m.organizations))
    .filter((o): o is { id: string; name: string } => !!o);

  const { data: allLandlords } = await supabase
    .from("property_landlords")
    .select("id, organizations(id, name)")
    .eq("property_id", id);
  // La organización dueña original siempre tiene su propia fila acá
  // (eco del backfill de Tanda A) — ya se muestra aparte en la
  // descripción de la sección, así que no tiene sentido listarse a sí
  // misma como si fuera un arrendador más agregado después.
  const landlords = (allLandlords ?? []).filter((l) => one(l.organizations)?.id !== property.organization_id);
  const broker = one(property.broker);

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6 md:px-6 md:py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Sección 1 — Datos de la propiedad: lo imprescindible para que la
          propiedad exista ya se guardó en /properties/new (guardado
          incremental); esta sección completa el resto. Las Secciones 2 y
          3 quedan reveladas debajo, en la misma pantalla con scroll —
          opcionales, se completan acá o después entrando al detalle. */}
      <Card>
        <CardHeader>
          <CardTitle>Datos de la propiedad</CardTitle>
          <CardDescription>{property.address}</CardDescription>
        </CardHeader>
        <CardContent>
          <PropertyDetailsForm action={updateProperty}>
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
              <Label htmlFor="expected_term_months">Plazo de arriendo (meses)</Label>
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
              <Label>Monto garantía de arriendo</Label>
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
          </PropertyDetailsForm>
        </CardContent>
      </Card>

      {/* Sección 2 — Arrendadores: buscador con auto-agregado al elegir
          un resultado, sin botón "Agregar" aparte. */}
      <Card>
        <CardHeader>
          <CardTitle>Arrendadores</CardTitle>
          <CardDescription>
            La organización original ({stripParticularSuffix(orgOptions.find((o) => o.id === property.organization_id)?.name ?? "—")}) sigue
            siendo quien administra la propiedad. Los demás arrendadores solo figuran acá.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {landlords.length > 0 ? (
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
            <p className="text-sm text-muted-foreground">Sin arrendadores adicionales todavía.</p>
          )}
          <form action={addPropertyLandlord}>
            <input type="hidden" name="property_id" value={id} />
            <LandlordSearchField />
          </form>
        </CardContent>
      </Card>

      {/* Sección 3 — Corredor asociado: mismo patrón de auto-agregado.
          Un solo corredor por propiedad (broker_organization_id es una
          columna escalar en properties, no una tabla puente). */}
      <Card>
        <CardHeader>
          <CardTitle>Corredor asociado</CardTitle>
          <CardDescription>El corredor que te ayuda a gestionar esta propiedad, si tienes uno.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {broker ? (
            <div className="rounded-lg border px-3 py-1.5 text-sm">
              <span className="truncate">{broker.name}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin corredor asociado todavía.</p>
          )}
          <form action={setPropertyBroker}>
            <input type="hidden" name="property_id" value={id} />
            <BrokerSearchField />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
