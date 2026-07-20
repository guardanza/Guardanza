import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProperty } from "@/lib/actions/properties";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PropertyThumb } from "@/components/property-thumb";

export default async function EditPropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: property, error: fetchError } = await supabase.from("properties").select("*").eq("id", id).single();
  if (fetchError || !property) notFound();

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6 md:px-6 md:py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Editar propiedad</CardTitle>
          <CardDescription>{property.address}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProperty} className="space-y-3" encType="multipart/form-data">
            <input type="hidden" name="id" value={id} />
            <PropertyThumb url={property.photo_url} className="h-32 w-full rounded-lg" />
            <div className="space-y-1.5">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" name="address" defaultValue={property.address} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="comuna">Comuna</Label>
                <Input id="comuna" name="comuna" defaultValue={property.comuna ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" name="city" defaultValue={property.city ?? ""} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="photo">Reemplazar foto (opcional)</Label>
              <Input id="photo" name="photo" type="file" accept="image/*" className="p-1.5" />
            </div>
            <Button type="submit" className="w-full">
              Guardar cambios
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
