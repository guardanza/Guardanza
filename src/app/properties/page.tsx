import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PropertyThumb } from "@/components/property-thumb";

export default async function PropertiesPage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: properties, error } = await supabase
    .from("properties")
    .select("id, address, comuna, city, photo_url, organizations!properties_organization_id_fkey(name), broker:organizations!properties_broker_organization_id_fkey(name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Propiedades</h1>
          <p className="text-sm text-muted-foreground">Catálogo de propiedades vinculadas a tus participantes.</p>
        </div>
        <Link href="/properties/new" className={buttonVariants()}>
          + Nueva propiedad
        </Link>
      </div>

      {properties && properties.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {properties.map((p) => {
            const owner = one(p.organizations);
            const broker = one(p.broker);
            return (
              <Link key={p.id} href={`/properties/${p.id}`}>
                <Card className="gap-0 overflow-hidden p-0 transition-shadow hover:shadow-md">
                  <PropertyThumb url={p.photo_url} className="h-36 w-full" />
                  <CardContent className="space-y-1.5 py-3">
                    <p className="truncate text-sm font-medium">{p.address}</p>
                    <p className="text-xs text-muted-foreground">
                      {[p.comuna, p.city].filter(Boolean).join(", ") || "Sin ubicación"}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {owner && <Badge variant="secondary">{owner.name}</Badge>}
                      {broker && <Badge variant="outline">{broker.name}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
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
