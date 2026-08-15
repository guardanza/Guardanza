import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Plus, SearchX, ChevronLeft, FileClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";
import { searchPropertyIds } from "@/lib/property-search";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PropertyThumb } from "@/components/property-thumb";
import { PropertySearchField } from "@/components/property-search-field";
import { PropertyStatusFilter } from "@/components/property-status-filter";
import { cn } from "@/lib/utils";

type StatusFilter = "activa" | "inactiva" | "todas";

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status: statusParam } = await searchParams;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  // "borrador" nunca es una opción del selector (ver PropertyStatusFilter)
  // — solo se llega acá vía el aviso de arriba, con varios borradores a
  // la vez. Cualquier otro valor no reconocido cae en "activa", el
  // default real de la vista normal.
  const statusFilter: StatusFilter | "borrador" =
    statusParam === "inactiva" || statusParam === "todas" || statusParam === "borrador" ? statusParam : "activa";
  const viewingDrafts = statusFilter === "borrador";

  // El aviso de borradores se calcula siempre, sin importar qué filtro
  // esté activo — es un pendiente del corredor, no parte del catálogo
  // filtrado. RLS (properties_select_member) ya acota esto a lo que
  // administra, sin necesitar resolver su organización acá.
  const { data: draftRows } = await supabase.from("properties").select("id").eq("status", "borrador");
  const draftCount = draftRows?.length ?? 0;
  const singleDraftId = draftCount === 1 ? draftRows![0].id : null;

  const matchedIds = q ? await searchPropertyIds(supabase, q) : null;
  const searching = matchedIds !== null;

  let baseQuery = supabase
    .from("properties")
    .select("id, address, photo_url, status, communes(name, regions(name))")
    .order("created_at", { ascending: false });
  baseQuery = statusFilter === "todas" ? baseQuery.neq("status", "borrador") : baseQuery.eq("status", statusFilter);

  const { data: properties, error } =
    searching && matchedIds.size === 0
      ? { data: [], error: null }
      : await (searching ? baseQuery.in("id", [...matchedIds]) : baseQuery);
  if (error) throw new Error(error.message);

  // Ocupada = tiene un contrato que no terminó, mismo criterio que la
  // ficha de propiedad — una consulta para todo el catálogo en vez de
  // una por tarjeta, para no pagar N+1 en una lista que puede crecer.
  const propertyIds = (properties ?? []).map((p) => p.id);
  const { data: contracts } =
    propertyIds.length > 0
      ? await supabase.from("contracts").select("property_id, status").in("property_id", propertyIds)
      : { data: [] };
  const occupiedIds = new Set(
    (contracts ?? []).filter((c) => c.status !== "finalizado" && c.status !== "cancelado").map((c) => c.property_id)
  );

  const emptyMessage = searching
    ? `Sin resultados para "${q}".`
    : statusFilter === "inactiva"
      ? "No tienes propiedades fuera de cartera."
      : statusFilter === "todas"
        ? "Sin propiedades todavía."
        : viewingDrafts
          ? "Sin propiedades sin terminar."
          : "Sin propiedades activas todavía.";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      {viewingDrafts ? (
        <div>
          <Link href="/properties" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" />
            Propiedades
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">Propiedades sin terminar</h1>
          <p className="text-sm text-muted-foreground">Retómalas para completar el alta.</p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Propiedades</h1>
            <p className="text-sm text-muted-foreground">Catálogo de propiedades vinculadas a tus organizaciones.</p>
          </div>
          <Link href="/properties/new" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-3.5" />
            Nueva
          </Link>
        </div>
      )}

      {/* Aviso de borradores: un pendiente que empuja a completarlos, no
          una pestaña fría — por eso vive arriba de todo, sin importar qué
          filtro esté activo, y desaparece solo cuando no queda ninguno. */}
      {!viewingDrafts && draftCount > 0 && (
        <Link href={singleDraftId ? `/properties/${singleDraftId}/edit` : "/properties?status=borrador"}>
          <Card className="border-brand-gold/40 bg-brand-gold/5 transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-3">
              <FileClock className="size-5 shrink-0 text-brand-gold" strokeWidth={2} />
              <div className="flex-1">
                <p className="text-sm font-medium text-primary">
                  Tienes {draftCount} {draftCount === 1 ? "propiedad sin terminar" : "propiedades sin terminar"} — complétala
                  {draftCount === 1 ? "" : "s"}.
                </p>
                <p className="text-xs text-muted-foreground">Falta terminar el alta para que quede activa.</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {!viewingDrafts && (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <PropertySearchField initialQuery={q ?? ""} status={statusFilter} />
          </div>
          <PropertyStatusFilter status={statusFilter} query={q ?? ""} />
        </div>
      )}

      {properties && properties.length > 0 ? (
        <div className="space-y-2">
          {properties.map((p) => {
            const commune = one(p.communes);
            const region = commune ? one(commune.regions) : null;
            const occupied = occupiedIds.has(p.id);
            return (
              <Link key={p.id} href={viewingDrafts ? `/properties/${p.id}/edit` : `/properties/${p.id}`}>
                <Card size="sm" className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3">
                    <PropertyThumb url={p.photo_url} className="size-16 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-medium">{p.address}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[commune?.name, region?.name].filter(Boolean).join(", ") || "Sin ubicación"}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {viewingDrafts ? (
                          <Badge variant="secondary" className="bg-accent text-accent-foreground">
                            Falta completar
                          </Badge>
                        ) : (
                          <>
                            {p.status === "inactiva" && (
                              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                Fuera de cartera
                              </Badge>
                            )}
                            <Badge variant="secondary" className="bg-success/15 text-success">
                              Arrendador
                            </Badge>
                            <Badge variant="secondary" className={cn(occupied ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                              {occupied ? "Arrendatario" : "Sin adjudicar"}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : searching ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <SearchX className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Building2 className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
