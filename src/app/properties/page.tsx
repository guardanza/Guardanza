import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Plus, SearchX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";
import { searchPropertyIds } from "@/lib/property-search";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PropertyThumb } from "@/components/property-thumb";
import { PropertySearchField } from "@/components/property-search-field";
import { cn } from "@/lib/utils";

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const matchedIds = q ? await searchPropertyIds(supabase, q) : null;
  const searching = matchedIds !== null;

  const baseQuery = supabase.from("properties").select("id, address, photo_url, communes(name, regions(name))").order("created_at", { ascending: false });
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

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-10">
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

      <PropertySearchField initialQuery={q ?? ""} />

      {properties && properties.length > 0 ? (
        <div className="space-y-2">
          {properties.map((p) => {
            const commune = one(p.communes);
            const region = commune ? one(commune.regions) : null;
            const occupied = occupiedIds.has(p.id);
            return (
              <Link key={p.id} href={`/properties/${p.id}`}>
                <Card size="sm" className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3">
                    <PropertyThumb url={p.photo_url} className="size-16 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-medium">{p.address}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[commune?.name, region?.name].filter(Boolean).join(", ") || "Sin ubicación"}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        <Badge variant="secondary" className="bg-success/15 text-success">
                          Arrendador
                        </Badge>
                        <Badge variant="secondary" className={cn(occupied ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                          {occupied ? "Arrendatario" : "Sin adjudicar"}
                        </Badge>
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
            <p className="text-sm text-muted-foreground">Sin resultados para &ldquo;{q}&rdquo;.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Building2 className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">Sin propiedades todavía.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
