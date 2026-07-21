import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileTypeLabel } from "@/lib/profile-label";
import { updateProfile } from "@/lib/actions/profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userRes.user.id).single();
  const profileType = await getProfileTypeLabel(supabase, userRes.user.id);

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6 md:px-6 md:py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Perfil</h1>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{userRes.user.email}</p>
          <Badge variant="outline">{profileType}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
          <CardDescription>Tu RUT se valida automáticamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nombre completo</Label>
              <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rut">RUT</Label>
              <Input id="rut" name="rut" defaultValue={profile?.rut ?? ""} placeholder="12.345.678-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} placeholder="+56 9 1234 5678" />
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
