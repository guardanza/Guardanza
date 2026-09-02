import Link from "next/link";
import { notFound } from "next/navigation";
import { Home } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";
import { orgTypeLabel } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PropertyThumb } from "@/components/property-thumb";
import { GreenCard } from "@/components/ui/green-card";
import { SectionTitle } from "@/components/ui/section-title";
import { cn } from "@/lib/utils";

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: org, error } = await supabase.from("organizations").select("*").eq("id", id).single();
  if (error || !org) notFound();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, address, photo_url, communes(name)")
    .or(`organization_id.eq.${id},broker_organization_id.eq.${id}`)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{org.name}</h1>
          <Badge variant="outline">{orgTypeLabel(org.type)}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Código para compartir (para que otra organización te delegue propiedades como corredora):{" "}
          <span className="font-mono font-medium text-foreground">{org.org_code}</span>
        </p>
      </div>

      <GreenCard className="p-0">
        <div className="flex items-center justify-between gap-2 border-b border-white/12 px-4 py-3 sm:px-6">
          <SectionTitle onGreen>Propiedades vinculadas</SectionTitle>
          <Link
            href={`/properties/new?organization_id=${id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 border-white/65 bg-transparent text-white hover:bg-white/12")}
          >
            + Nueva propiedad
          </Link>
        </div>
        {properties && properties.length > 0 ? (
          <div className="divide-y divide-white/12">
            {properties.map((p) => (
              <Link key={p.id} href={`/properties/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 sm:px-6">
                <PropertyThumb url={p.photo_url} className="size-11 shrink-0 rounded-lg border border-white/15" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{p.address}</p>
                  <p className="text-xs text-white">{one(p.communes)?.name ?? "Sin comuna"}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Home className="size-8 text-white/70" strokeWidth={1.5} />
            <p className="text-sm text-white">Sin propiedades vinculadas todavía.</p>
          </div>
        )}
      </GreenCard>
    </div>
  );
}
