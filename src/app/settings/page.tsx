import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { changePassword } from "@/lib/actions/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6 md:px-6 md:py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>Contraseña actualizada.</AlertDescription>
        </Alert>
      )}
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Configuración</h1>
        <p className="text-sm text-muted-foreground">{userRes.user.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
          <CardDescription>Mínimo 6 caracteres.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={changePassword} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input id="password" name="password" type="password" minLength={6} required />
            </div>
            <Button type="submit" className="w-full">
              Actualizar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
