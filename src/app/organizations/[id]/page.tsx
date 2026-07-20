import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: org, error } = await supabase.from("organizations").select("*").eq("id", id).single();
  if (error || !org) notFound();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, address, comuna")
    .eq("organization_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-xl font-semibold">{org.name}</h1>
      <p className="text-sm text-gray-500">{org.type === "broker" ? "Corredora" : "Arrendador individual"}</p>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Propiedades</h2>
          <Link href={`/properties/new?organization_id=${id}`} className="text-sm underline">
            + Nueva propiedad
          </Link>
        </div>
        <ul className="divide-y border">
          {properties?.map((p) => (
            <li key={p.id} className="flex items-center justify-between p-3">
              <span>
                {p.address} {p.comuna && <span className="text-sm text-gray-500">({p.comuna})</span>}
              </span>
              <Link href={`/contracts/new?property_id=${p.id}`} className="text-sm underline">
                Nuevo contrato
              </Link>
            </li>
          ))}
          {(!properties || properties.length === 0) && (
            <li className="p-3 text-sm text-gray-500">Sin propiedades todavía.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
