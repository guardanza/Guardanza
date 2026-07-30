import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";
import { deleteProperty } from "@/lib/actions/properties";
import { stripParticularSuffix } from "@/lib/labels";
import { formatMoney, type MoneyCurrency } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { PropertyThumb } from "@/components/property-thumb";

export default async function PropertyDetailPage({
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
    .select(
      "id, address, photo_url, organization_id, listing_url, expected_rent_amount, expected_rent_currency, expected_term_months, expected_guarantee_amount, expected_guarantee_currency, property_landlords(organizations(id, name)), broker:organizations!properties_broker_organization_id_fkey(name), communes(name, regions(name))"
    )
    .eq("id", id)
    .single();
  if (fetchError || !property) notFound();

  const owners = (property.property_landlords ?? [])
    .map((l) => one(l.organizations))
    .filter((o): o is { id: string; name: string } => !!o);
  const broker = one(property.broker);
  const commune = one(property.communes);
  const region = commune ? one(commune.regions) : null;
  const hasListingDetails =
    property.listing_url || property.expected_rent_amount || property.expected_term_months || property.expected_guarantee_amount;

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, status, start_date, guarantee_amount, guarantee_currency")
    .eq("property_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <PropertyThumb url={property.photo_url} className="h-48 w-full rounded-xl sm:h-64" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{property.address}</h1>
          <p className="text-sm text-muted-foreground">
            {[commune?.name, region?.name].filter(Boolean).join(", ") || "Sin ubicación"}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {owners.map((o) => (
              <Badge key={o.id} variant="secondary">
                {stripParticularSuffix(o.name)}
              </Badge>
            ))}
            {broker && <Badge variant="outline">Corredora: {broker.name}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/properties/${id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Pencil /> Editar
          </Link>
          <form action={deleteProperty}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" className={buttonVariants({ variant: "destructive", size: "sm" })}>
              <Trash2 /> Eliminar
            </button>
          </form>
        </div>
      </div>

      {hasListingDetails && (
        <Card className="p-0">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">Detalles del listado</h2>
          </div>
          <CardContent className="space-y-2 py-4 text-sm">
            {property.listing_url && (
              <a
                href={property.listing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
              >
                Ver aviso externo <ExternalLink className="size-3.5" strokeWidth={2} />
              </a>
            )}
            {property.expected_rent_amount && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Arriendo mensual esperado</span>
                <span className="font-medium tabular-nums">
                  {formatMoney(property.expected_rent_amount, (property.expected_rent_currency as MoneyCurrency) ?? "CLP")}
                </span>
              </div>
            )}
            {property.expected_term_months && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Plazo de arriendo esperado</span>
                <span className="font-medium tabular-nums">{property.expected_term_months} meses</span>
              </div>
            )}
            {property.expected_guarantee_amount && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Garantía esperada</span>
                <span className="font-medium tabular-nums">
                  {formatMoney(property.expected_guarantee_amount, (property.expected_guarantee_currency as MoneyCurrency) ?? "CLP")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-medium">Contratos</h2>
          <Link href={`/contracts/new?property_id=${id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            + Nuevo contrato
          </Link>
        </div>
        {contracts && contracts.length > 0 ? (
          <div className="divide-y">
            {contracts.map((c) => (
              <Link key={c.id} href={`/contracts/${c.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50">
                <span>
                  {c.guarantee_amount} {c.guarantee_currency}
                </span>
                <StatusBadge status={c.status} />
              </Link>
            ))}
          </div>
        ) : (
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Sin contratos todavía.</CardContent>
        )}
      </Card>
    </div>
  );
}
