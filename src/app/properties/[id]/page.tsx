import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";
import { deleteProperty } from "@/lib/actions/properties";
import { addPropertyCandidate, markCandidateNotSelected, reactivateCandidate } from "@/lib/actions/candidates";
import { stripParticularSuffix } from "@/lib/labels";
import { formatMoney, type MoneyCurrency } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { PropertyThumb } from "@/components/property-thumb";
import { CandidateSearchField } from "@/components/candidate-search-field";
import { AdjudicateCandidateSheet, DiscardCandidateSheet } from "@/components/candidate-decision-sheets";
import { ListingPortalLink } from "@/components/listing-portal-link";

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

  // "Ocupada" = tiene un contrato que no terminó — mismo criterio que el
  // trigger property_candidates_block_if_occupied en la base, para que la
  // UI nunca muestre un buscador que la base va a rechazar igual.
  const isOccupied = (contracts ?? []).some((c) => c.status !== "finalizado" && c.status !== "cancelado");

  const { data: candidateRows } = await supabase
    .from("property_candidates")
    .select("id, status, contacts(full_name, email, status)")
    .eq("property_id", id)
    .order("created_at", { ascending: false });
  const candidates = (candidateRows ?? [])
    .map((c) => ({ id: c.id, status: c.status, contact: one(c.contacts) }))
    .filter((c): c is { id: string; status: string; contact: { full_name: string; email: string; status: string } } => !!c.contact);

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
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="text-sm font-medium">Detalles de la propiedad</h2>
            {property.listing_url && <ListingPortalLink url={property.listing_url} />}
          </div>
          <CardContent className="space-y-2 py-4 text-sm">
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

      {/* Candidatos (Tanda D Fase 1): no se muestra si la propiedad ya
          tiene un contrato en curso — está ocupada, no admite candidatos
          nuevos (mismo criterio que el trigger en la base). "Elegir
          ganador" lleva al formulario de contrato precargado con los
          datos esperados de la propiedad — la creación real (y el paso
          de los demás candidatos a no_seleccionado) pasa recién ahí,
          vía select_winning_candidate(). */}
      {!isOccupied && (
        // Esta tarjeta es donde se toma la decisión importante (elegir al
        // arrendatario) — el acento dorado que el resto de las tarjetas
        // solo muestra al pasar el mouse (before:scale-y-0 en Card, ver
        // card.tsx) queda permanente acá, más un borde levemente más
        // definido. Mismo lenguaje visual del sistema, sin fondo de color
        // (eso se reserva para los avisos informativos) — para que
        // destaque sin leerse como una alerta.
        <Card className="p-0 border-brand-gold/40 before:scale-y-100">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">Candidatos para arrendar</h2>
            <p className="text-xs text-muted-foreground">Personas de tu libreta en evaluación para ser el arrendatario de esta propiedad.</p>
          </div>
          <CardContent className="space-y-3 py-4">
            {candidates.length > 0 ? (
              <ul className="space-y-1.5">
                {candidates.map((c) => (
                  <li key={c.id} className="flex flex-col gap-2 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.contact.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.contact.email}
                        {c.contact.status === "pendiente" && " · pendiente de confirmar"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {/* "en_evaluacion" es implícito: ya está dentro del
                          marco "Candidatos para arrendar", repetirlo acá
                          es redundante. El estado sigue existiendo abajo
                          sin cambios — solo se oculta esta etiqueta. */}
                      {c.status !== "en_evaluacion" && <StatusBadge status={c.status} />}
                      {c.status === "en_evaluacion" && (
                        <>
                          {c.contact.status === "confirmado" ? (
                            <AdjudicateCandidateSheet
                              href={`/contracts/new?property_id=${id}&candidate_id=${c.id}`}
                              fullName={c.contact.full_name}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">No puede ganar hasta confirmar su cuenta</span>
                          )}
                          <DiscardCandidateSheet
                            action={markCandidateNotSelected}
                            candidateId={c.id}
                            propertyId={id}
                            fullName={c.contact.full_name}
                          />
                        </>
                      )}
                      {c.status === "no_seleccionado" && (
                        <form action={reactivateCandidate}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="property_id" value={id} />
                          <Button type="submit" variant="outline" size="sm">
                            Reactivar
                          </Button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sin candidatos todavía.</p>
            )}
            <form action={addPropertyCandidate}>
              <input type="hidden" name="property_id" value={id} />
              <CandidateSearchField />
            </form>
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
