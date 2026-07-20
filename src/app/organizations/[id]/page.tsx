import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{org.name}</h1>
          <Badge variant="outline">{org.type === "broker" ? "Corredora" : "Arrendador individual"}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Código para compartir (para que te deleguen propiedades como corredora):{" "}
          <span className="font-mono font-medium text-foreground">{org.org_code}</span>
        </p>
      </div>

      <Card className="p-0">
        <CardHeader className="border-b pt-4 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Propiedades</CardTitle>
            <Link href={`/properties/new?organization_id=${id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              + Nueva propiedad
            </Link>
          </div>
        </CardHeader>
        {properties && properties.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dirección</TableHead>
                <TableHead>Comuna</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.address}</TableCell>
                  <TableCell className="text-muted-foreground">{p.comuna ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/contracts/new?property_id=${p.id}`} className="text-sm underline-offset-4 hover:underline">
                      Nuevo contrato
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Sin propiedades todavía.
          </CardContent>
        )}
      </Card>
    </div>
  );
}
