import { createProperty } from "@/lib/actions/properties";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ organization_id?: string; error?: string }>;
}) {
  const { organization_id, error } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-4 px-6 py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Nueva propiedad</CardTitle>
          <CardDescription>Se asocia a la organización desde la que veniste.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createProperty} className="space-y-3">
            <input type="hidden" name="organization_id" defaultValue={organization_id} />
            <div className="space-y-1.5">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" name="address" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comuna">Comuna</Label>
              <Input id="comuna" name="comuna" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="broker_org_code">Código de organización corredora (opcional)</Label>
              <Input id="broker_org_code" name="broker_org_code" placeholder="Ej: 384021 — te lo comparte la corredora" />
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
