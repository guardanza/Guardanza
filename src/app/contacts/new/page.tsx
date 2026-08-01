import { redirect } from "next/navigation";
import { createContact } from "@/lib/actions/contacts";
import { createClient } from "@/lib/supabase/server";
import { stripParticularSuffix } from "@/lib/labels";
import { roleBucketLabel, type RoleBucket } from "@/lib/role-bucket";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ROLE_OPTIONS: RoleBucket[] = ["arrendatario", "arrendador", "corredor"];

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ organization_id?: string; error?: string; role?: string }>;
}) {
  const { organization_id, error, role } = await searchParams;
  const defaultRole: RoleBucket = ROLE_OPTIONS.includes(role as RoleBucket) ? (role as RoleBucket) : "arrendatario";
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  let orgOptions: { id: string; name: string }[] = [];
  if (!organization_id) {
    const { data: memberships } = await supabase
      .from("memberships")
      .select("role, organizations(id, name)")
      .eq("role", "admin");
    orgOptions = (memberships ?? [])
      .map((m) => (Array.isArray(m.organizations) ? m.organizations[0] : m.organizations))
      .filter((o): o is { id: string; name: string } => !!o);
  }

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6 md:px-6 md:py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Nuevo contacto</CardTitle>
          <CardDescription>
            Carga la ficha completa — todavía no se envía ninguna invitación, eso llega en un paso posterior.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createContact} className="space-y-3">
            {organization_id ? (
              <input type="hidden" name="organization_id" defaultValue={organization_id} />
            ) : orgOptions.length === 1 ? (
              <input type="hidden" name="organization_id" defaultValue={orgOptions[0].id} />
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Organización:</span>
                <select
                  name="organization_id"
                  required
                  defaultValue={orgOptions[0]?.id ?? ""}
                  className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {orgOptions.length === 0 && <option value="">No administras ninguna organización todavía</option>}
                  {orgOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {stripParticularSuffix(o.name)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="contact_role">Rol esperado</Label>
              <select
                id="contact_role"
                name="contact_role"
                required
                defaultValue={defaultRole}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {roleBucketLabel(r)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nombre completo</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rut">RUT</Label>
              <Input id="rut" name="rut" required placeholder="11.111.111-1" />
            </div>
            <Button type="submit" className="w-full">
              Cargar contacto
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
