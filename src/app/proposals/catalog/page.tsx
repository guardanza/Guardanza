import { createClient } from "@/lib/supabase/server";
import { createRepairReference, updateRepairPrice } from "@/lib/actions/catalog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GreenCard, GreenEmptyState } from "@/components/ui/green-card";
import { ClipboardList } from "lucide-react";

export default async function CatalogPage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const { data: profile } = userRes.user
    ? await supabase.from("profiles").select("is_platform_admin").eq("id", userRes.user.id).single()
    : { data: null };
  const isPlatformAdmin = profile?.is_platform_admin ?? false;

  const { data: references } = await supabase
    .from("repair_reference")
    .select("id, code, description, unit, repair_reference_versions(id, unit_price, valid_from, valid_to)")
    .order("code");

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Catálogo de reparaciones</h1>
        <p className="text-sm text-muted-foreground">
          Referencia de precios para las propuestas de descuento. Solo el administrador de la plataforma puede editarlo.
        </p>
      </div>

      <div className="space-y-3">
        {references?.map((r) => {
          const versions = [...(r.repair_reference_versions ?? [])].sort(
            (a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
          );
          const current = versions.find((v) => v.valid_to === null);

          return (
            <GreenCard key={r.id} className="p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">
                    {r.description} <span className="text-sm font-normal text-white">({r.unit})</span>
                  </p>
                  <Badge variant="outline" className="mt-1 border-white/50 bg-transparent font-mono text-white">
                    {r.code}
                  </Badge>
                </div>
                <p className="text-lg font-bold text-white">{current?.unit_price ?? "—"}</p>
              </div>

              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-white underline-offset-4 hover:underline">Historial de versiones</summary>
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-white">
                  {versions.map((v) => (
                    <li key={v.id}>
                      {v.unit_price} — desde {v.valid_from} {v.valid_to ? `hasta ${v.valid_to}` : "(vigente)"}
                    </li>
                  ))}
                </ul>
              </details>

              {isPlatformAdmin && (
                <form action={updateRepairPrice} className="mt-3 flex gap-2">
                  <input type="hidden" name="repair_reference_id" value={r.id} />
                  <Input name="unit_price" type="number" step="0.01" placeholder="Nuevo precio" required className="max-w-40 bg-white" />
                  <Button type="submit" variant="outline" size="sm" className="border-white/65 bg-transparent text-white hover:bg-white/12">
                    Actualizar precio
                  </Button>
                </form>
              )}
            </GreenCard>
          );
        })}
        {(!references || references.length === 0) && <GreenEmptyState icon={ClipboardList} message="Sin tipos de reparación todavía." />}
      </div>

      {isPlatformAdmin && (
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
      )}
    </div>
  );
}
