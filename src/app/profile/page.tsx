import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileTypeLabel } from "@/lib/profile-label";
import { getAuthProvider } from "@/lib/auth-provider";
import { updateProfile } from "@/lib/actions/profile";
import { changePassword } from "@/lib/actions/settings";
import { updateSystemConfig } from "@/lib/actions/system-config";
import { requestRoleChange } from "@/lib/actions/role-change";
import { labelToRoleBucket } from "@/lib/role-bucket";
import { one } from "@/lib/supabase/one";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/profile-form";
import { SavedIndicator } from "@/components/saved-indicator";
import { AvatarPicker } from "@/components/avatar-picker";
import { ChangePasswordForm } from "@/components/change-password-form";
import { RoleChangeRequestDialog } from "@/components/role-change-request-dialog";
import { GoogleIcon } from "@/components/icons/google-icon";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; next?: string; highlight?: string }>;
}) {
  const { error, success, next, highlight } = await searchParams;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userRes.user.id).single();
  const profileType = await getProfileTypeLabel(supabase, userRes.user.id);
  const provider = getAuthProvider(userRes.user);
  const currentBucket = labelToRoleBucket(profileType);

  const { data: config } = profile?.is_platform_admin
    ? await supabase.from("system_config").select("*").single()
    : { data: null };

  const [{ data: ultimaSolicitud }, { data: misPartidas }] = profile?.is_platform_admin
    ? [{ data: null }, { data: null }]
    : await Promise.all([
        supabase
          .from("solicitudes_cambio_rol")
          .select("id, estado, rol_solicitado, motivo_rechazo, created_at, resuelto_at")
          .eq("user_id", userRes.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("contract_parties").select("contracts(status)").eq("user_id", userRes.user.id),
      ]);
  const activeContractsCount = (misPartidas ?? []).filter((p) => one(p.contracts)?.status !== "finalizado").length;

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 md:px-6 md:py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="success">
          <AlertDescription>
            {success === "config"
              ? "Parámetros del sistema actualizados."
              : success === "solicitud"
                ? "Tu solicitud de cambio de rol fue enviada. Te avisamos acá cuando la revisen."
                : "Contraseña actualizada."}
          </AlertDescription>
        </Alert>
      )}
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Perfil</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">{userRes.user.email}</p>
          <Badge variant="outline">{profileType}</Badge>
          {!profile?.is_platform_admin && ultimaSolicitud?.estado !== "pendiente" && (
            <RoleChangeRequestDialog
              action={requestRoleChange}
              currentBucket={currentBucket}
              currentLabel={profileType}
              activeContractsCount={activeContractsCount}
            />
          )}
        </div>
        {ultimaSolicitud && ultimaSolicitud.estado === "pendiente" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Tienes una solicitud de cambio de rol <span className="font-medium text-foreground">pendiente</span> de
            revisión.
          </p>
        )}
        {ultimaSolicitud && ultimaSolicitud.estado === "aprobada" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Tu última solicitud de cambio de rol fue <span className="font-medium text-foreground">aprobada</span>.
          </p>
        )}
        {ultimaSolicitud && ultimaSolicitud.estado === "rechazada" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Tu última solicitud de cambio de rol fue <span className="font-medium text-destructive">rechazada</span>
            {ultimaSolicitud.motivo_rechazo ? `: ${ultimaSolicitud.motivo_rechazo}` : "."}
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foto de perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarPicker avatarUrl={profile?.avatar_url ?? null} name={profile?.full_name ?? userRes.user.email ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Datos personales</CardTitle>
            <CardDescription>Tu RUT se valida automáticamente.</CardDescription>
          </div>
          <Suspense fallback={null}>
            <SavedIndicator />
          </Suspense>
        </CardHeader>
        <CardContent>
          <ProfileForm
            action={updateProfile}
            provider={provider}
            initialFullName={profile?.full_name ?? ""}
            initialRut={profile?.rut ?? ""}
            initialPhone={profile?.phone ?? ""}
            rutHighlighted={highlight === "rut"}
            next={next}
          />
        </CardContent>
      </Card>

      {provider === "google" ? (
        <Card>
          <CardHeader>
            <CardTitle>Seguridad</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
              <GoogleIcon className="size-4" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">Inicias sesión con Google.</p>
              <p className="text-xs text-muted-foreground">Tu contraseña la gestiona Google. No necesitas una en Guardanza.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Cambiar contraseña</CardTitle>
            <CardDescription>Necesitamos tu contraseña actual para confirmar que eres tú.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm action={changePassword} />
          </CardContent>
        </Card>
      )}

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
