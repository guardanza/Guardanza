import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileTypeLabel } from "@/lib/profile-label";
import { getAuthProvider } from "@/lib/auth-provider";
import { updateProfile } from "@/lib/actions/profile";
import { changePassword } from "@/lib/actions/settings";
import { updateSystemConfig } from "@/lib/actions/system-config";
import { requestRoleChange } from "@/lib/actions/role-change";
import { labelToRoleBucket, roleBucketLabel, type RoleBucket } from "@/lib/role-bucket";
import { one } from "@/lib/supabase/one";
import { orgTypeLabel, stripParticularSuffix } from "@/lib/labels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProfileForm } from "@/components/profile-form";
import { SavedIndicator } from "@/components/saved-indicator";
import { AvatarPicker } from "@/components/avatar-picker";
import { ChangePasswordForm } from "@/components/change-password-form";
import { RoleChangeRequestDialog } from "@/components/role-change-request-dialog";
import { RoleChip } from "@/components/role-chip";
import { StatusBadge } from "@/components/status-badge";
import { GoogleIcon } from "@/components/icons/google-icon";

const ESTADO_SOLICITUD_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

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

  // Paso 6.6: org_code y "+ Nueva organización" se mudan acá desde "Mi
  // Negocio" (que va camino a desaparecer, Paso 6.8). Con la Restricción B
  // (20260731170001) una cuenta administra como mucho una organización,
  // así que esto ya no es una lista — es, a lo sumo, una sola fila.
  const { data: memberships } = await supabase.from("memberships").select("role, organizations(id, name, type, org_code)");
  const hasAnyMembership = (memberships ?? []).length > 0;
  const myOrgMembership = (memberships ?? []).find((m) => m.role === "admin");
  const myOrg = myOrgMembership ? one(myOrgMembership.organizations) : null;

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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foto de perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarPicker avatarUrl={profile?.avatar_url ?? null} name={profile?.full_name ?? userRes.user.email ?? ""} />
        </CardContent>
      </Card>

      {!profile?.is_platform_admin && (
        <Card>
          <CardHeader>
            <CardTitle>Rol en Guardanza</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <RoleChip label={profileType} />
                {currentBucket === "corredor" && myOrg && (
                  <p className="text-xs text-muted-foreground">{stripParticularSuffix(myOrg.name)}</p>
                )}
              </div>
              {ultimaSolicitud?.estado !== "pendiente" && (
                <RoleChangeRequestDialog
                  action={requestRoleChange}
                  currentBucket={currentBucket}
                  currentLabel={profileType}
                  activeContractsCount={activeContractsCount}
                />
              )}
            </div>

            {ultimaSolicitud && (
              <div className="space-y-1.5 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Tu última solicitud de cambio de rol</span>
                  <StatusBadge status={ultimaSolicitud.estado} label={ESTADO_SOLICITUD_LABELS[ultimaSolicitud.estado]} />
                </div>
                <p>
                  Rol solicitado:{" "}
                  <span className="font-medium text-foreground">
                    {roleBucketLabel(ultimaSolicitud.rol_solicitado as RoleBucket)}
                  </span>
                </p>
                {ultimaSolicitud.estado === "rechazada" && ultimaSolicitud.motivo_rechazo && (
                  <p className="text-muted-foreground">Motivo: {ultimaSolicitud.motivo_rechazo}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Datos personales</CardTitle>
          <Suspense fallback={null}>
            <SavedIndicator />
          </Suspense>
        </CardHeader>
        <CardContent>
          <ProfileForm
            action={updateProfile}
            provider={provider}
            email={userRes.user.email ?? ""}
            initialFullName={profile?.full_name ?? ""}
            initialRut={profile?.rut ?? ""}
            initialPhone={profile?.phone ?? ""}
            rutHighlighted={highlight === "rut"}
            next={next}
          />
        </CardContent>
      </Card>

      {hasAnyMembership && (
        <Card>
          <CardHeader>
            <CardTitle>Tu organización</CardTitle>
            {myOrg && (
              <CardDescription>
                Código para compartir (para que otra organización te delegue propiedades como corredora):{" "}
                <span className="font-mono font-medium text-foreground">{myOrg.org_code}</span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {myOrg ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Link href={`/organizations/${myOrg.id}`} className="font-medium underline-offset-4 hover:underline">
                    {stripParticularSuffix(myOrg.name)}
                  </Link>
                  <p className="text-xs text-muted-foreground">{orgTypeLabel(myOrg.type)}</p>
                </div>
              </div>
            ) : (
              // Camino sin uso hoy: solo alcanzable con una membership
              // no-admin (role='agente'), un rol que ningún flujo del
              // producto asigna todavía — se deja andando por si el
              // roadmap futuro de "agentes de corredora" lo activa.
              <Link href="/organizations/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
                + Nueva organización
              </Link>
            )}
          </CardContent>
        </Card>
      )}

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
