import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { changePassword } from "@/lib/actions/settings";
import { updateSystemConfig } from "@/lib/actions/system-config";
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

  const { data: profile } = await supabase.from("profiles").select("is_platform_admin").eq("id", userRes.user.id).single();
  const { data: config } = profile?.is_platform_admin
    ? await supabase.from("system_config").select("*").single()
    : { data: null };

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6 md:px-6 md:py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success === "config" ? "Parámetros del sistema actualizados." : "Contraseña actualizada."}</AlertDescription>
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

      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Parámetros del sistema</CardTitle>
            <CardDescription>
              Solo visible para administradores de plataforma. Los cambios aplican a contratos nuevos — los ya activos
              mantienen la comisión congelada al momento del depósito.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateSystemConfig} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="comision_guardanza_pct">Comisión Guardanza (%)</Label>
                <Input
                  id="comision_guardanza_pct"
                  name="comision_guardanza_pct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="99"
                  defaultValue={(config.comision_guardanza_pct * 100).toFixed(2)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="comision_corredor_pct">Comisión corredor (%)</Label>
                <Input
                  id="comision_corredor_pct"
                  name="comision_corredor_pct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="99"
                  defaultValue={(config.comision_corredor_pct * 100).toFixed(2)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tasa_interes_anual">Tasa de interés anual sobre el float (%)</Label>
                <Input
                  id="tasa_interes_anual"
                  name="tasa_interes_anual"
                  type="number"
                  step="0.01"
                  min="0"
                  max="99"
                  defaultValue={(config.tasa_interes_anual * 100).toFixed(2)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Guardar parámetros
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
