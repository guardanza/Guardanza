import { createClient } from "@/lib/supabase/server";
import { createRepairReference, updateRepairPrice } from "@/lib/actions/catalog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function CatalogPage() {
  const supabase = await createClient();

  const { data: references } = await supabase
    .from("repair_reference")
    .select("id, code, description, unit, repair_reference_versions(id, unit_price, valid_from, valid_to)")
    .order("code");

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Catálogo de reparaciones</h1>
        <p className="text-sm text-muted-foreground">Solo administradores de organización pueden editarlo.</p>
      </div>

      <div className="space-y-3">
        {references?.map((r) => {
          const versions = [...(r.repair_reference_versions ?? [])].sort(
            (a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
          );
          const current = versions.find((v) => v.valid_to === null);

          return (
            <Card key={r.id}>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {r.description} <span className="text-sm text-muted-foreground">({r.unit})</span>
                    </p>
                    <Badge variant="outline" className="mt-1 font-mono">
                      {r.code}
                    </Badge>
                  </div>
                  <p className="text-lg font-medium">{current?.unit_price ?? "—"}</p>
                </div>

                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground underline-offset-4 hover:underline">
                    Historial de versiones
                  </summary>
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-muted-foreground">
                    {versions.map((v) => (
                      <li key={v.id}>
                        {v.unit_price} — desde {v.valid_from} {v.valid_to ? `hasta ${v.valid_to}` : "(vigente)"}
                      </li>
                    ))}
                  </ul>
                </details>

                <form action={updateRepairPrice} className="flex gap-2">
                  <input type="hidden" name="repair_reference_id" value={r.id} />
                  <Input name="unit_price" type="number" step="0.01" placeholder="Nuevo precio" required className="max-w-40" />
                  <Button type="submit" variant="outline" size="sm">
                    Actualizar precio
                  </Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
        {(!references || references.length === 0) && (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Sin tipos de reparación todavía.
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo tipo de reparación</CardTitle>
          <CardDescription>Crea la primera versión de precio junto con el tipo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createRepairReference} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="code">Código</Label>
              <Input id="code" name="code" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Descripción</Label>
              <Input id="description" name="description" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">Unidad (m2, unidad, hora)</Label>
              <Input id="unit" name="unit" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit_price">Precio</Label>
              <Input id="unit_price" name="unit_price" type="number" step="0.01" required />
            </div>
            <Button type="submit" className="w-full">
              Crear
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
