import { createOrganization } from "@/lib/actions/organizations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function NewOrganizationPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-6 md:px-6 md:py-10">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo participante</CardTitle>
          <CardDescription>
            Cualquier persona o empresa que administra propiedades — incluso si eres tú solo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createOrganization} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                name="type"
                required
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="individual">Arrendador individual</option>
                <option value="broker">Corredora</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" required />
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
