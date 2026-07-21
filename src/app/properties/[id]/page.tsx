import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";
import { deleteProperty } from "@/lib/actions/properties";
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
      "id, address, photo_url, organization_id, organizations!properties_organization_id_fkey(name), broker:organizations!properties_broker_organization_id_fkey(name), communes(name, regions(name))"
    )
    .eq("id", id)
    .single();
  if (fetchError || !property) notFound();

  const owner = one(property.organizations);
  const broker = one(property.broker);
  const commune = one(property.communes);
  const region = commune ? one(commune.regions) : null;

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
            {owner && <Badge variant="secondary">{owner.name}</Badge>}
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
