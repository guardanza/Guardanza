import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateProperty, addPropertyLandlord, removePropertyLandlord, setPropertyBroker } from "@/lib/actions/properties";
import { one } from "@/lib/supabase/one";
import { stripParticularSuffix } from "@/lib/labels";
import { getRegionsWithCommunes } from "@/lib/supabase/regions";
import { cn } from "@/lib/utils";
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
import { WizardSteps } from "@/components/wizard-steps";

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

  const { data: allLandlords } = await supabase
    .from("property_landlords")
    .select("id, organizations(id, name, type)")
    .eq("property_id", id);
  // Solo type='individual' cuenta como arrendador real — la organización
  // creadora (siempre la del corredor, type='broker') entra sola a esta
  // tabla desde createProperty, pero no es un arrendador de verdad. Mismo
  // criterio que la ficha de propiedad y el flujo guiado de contrato.
  const landlordOrgs = (allLandlords ?? [])
    .map((l) => ({ linkId: l.id, org: one(l.organizations) }))
    .filter((l): l is { linkId: string; org: { id: string; name: string; type: string } } => !!l.org);
  const owners = landlordOrgs.filter((l) => l.org.type === "individual");
  const hasLandlord = owners.length > 0;
  const broker = one(property.broker);

  const inviteHref = `/contacts/new?role=arrendador&next=${encodeURIComponent(`/properties/${id}/edit`)}`;

  const landlordSection = (
    <Card
      id="arrendadores"
      className={cn(
        "p-0 transition-shadow duration-500",
        !hasLandlord && "border-brand-gold/40 before:scale-y-100"
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium">Arrendadores</h2>
            {!hasLandlord && (
              <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                Falta asignar
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">La persona dueña de la propiedad — se busca en tu libreta de contactos.</p>
        </div>
      </div>
      <CardContent className="space-y-3 py-4">
        {owners.length > 0 ? (
          <ul className="space-y-1.5">
            {owners.map((l) => (
              <li key={l.linkId} className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm">
                <span>{stripParticularSuffix(l.org.name)}</span>
                {/* La fila que coincide con organization_id es la
                    organización creadora — no se puede quitar desde acá
                    (property_landlords_delete lo permitiría, pero dejar
                    la propiedad sin ninguna fila de esa tabla rompe el
                    invariante que createProperty establece). Las demás
                    (copropietarios agregados después) sí. */}
                {l.org.id !== property.organization_id && (
                  <form action={removePropertyLandlord}>
                    <input type="hidden" name="id" value={l.linkId} />
                    <input type="hidden" name="property_id" value={id} />
                    <button type="submit" className="text-muted-foreground hover:text-destructive">
                      <X className="size-4" />
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sin arrendador todavía.</p>
        )}
        <form action={addPropertyLandlord}>
          <input type="hidden" name="property_id" value={id} />
          <LandlordSearchField inviteHref={inviteHref} />
        </form>
      </CardContent>
    </Card>
  );

  // Paso 1 del wizard: la propiedad recién nacida (dirección/comuna ya
  // guardadas por /properties/new) todavía no tiene arrendador. No avanza
  // a Paso 2 hasta que haya uno — cierra el hueco por el que hoy se podía
  // llegar a crear un contrato sin arrendador real.
  if (property.status === "borrador" && !hasLandlord) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-6 md:px-6 md:py-10">
        <WizardSteps current={1} />
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Datos de la propiedad</CardTitle>
            <CardDescription>{property.address}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateProperty} className="space-y-3">
              <input type="hidden" name="id" value={id} />
              <div className="space-y-1.5">
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" name="address" defaultValue={property.address} required />
              </div>
              <RegionCommuneSelect regions={regions} defaultCommuneId={property.commune_id} />
              <Button type="submit" variant="outline" className="w-full">
                Guardar cambios
              </Button>
            </form>
          </CardContent>
        </Card>
        {landlordSection}
      </div>
    );
  }

  // Paso 2: ya hay arrendador. Foto y valores esperados — al confirmar,
  // la propiedad pasa de 'borrador' a 'activa' (activate=1, ver
  // updateProperty). Todavía sin Corredor asociado acá: no es un paso del
  // wizard, el usuario ya es el corredor por defecto.
  if (property.status === "borrador") {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-6 md:px-6 md:py-10">
        <WizardSteps current={2} />
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Foto y valores</CardTitle>
            <CardDescription>{property.address}</CardDescription>
          </CardHeader>
          <CardContent>
            <PropertyDetailsForm action={updateProperty}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="activate" value="1" />
              <PropertyPhotoField photoUrl={property.photo_url} />
              <div className="space-y-1.5">
                <Label htmlFor="listing_url">Link externo (opcional)</Label>
                <Input
                  id="listing_url"
                  name="listing_url"
                  type="text"
                  placeholder="portalinmobiliario.cl/..."
                  defaultValue={property.listing_url ?? ""}
                />
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
                Confirmar
              </Button>
            </PropertyDetailsForm>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Propiedad ya activa: la vista de edición de siempre, todo junto —
  // sin el selector "Arrendador" (era en realidad quién administra la
  // ficha, mostraba las propias corredoras del usuario — bug, retirado
  // por completo, no solo del wizard).
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6 md:px-6 md:py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
              <Label htmlFor="listing_url">Link externo (opcional)</Label>
              <Input
                id="listing_url"
                name="listing_url"
                type="text"
                placeholder="portalinmobiliario.cl/..."
                defaultValue={property.listing_url ?? ""}
              />
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

      {landlordSection}

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
