import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resetPassword } from "@/lib/actions/password-reset";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { NewPasswordForm } from "@/components/new-password-form";
import { AutoRedirect } from "@/components/auto-redirect";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();

  // No session means the recovery link's code exchange never happened or
  // failed — expired, already used, or someone just landed here directly.
  // All of those collapse to the same "get a new link" message; there's no
  // way (or reason) to tell them apart for the user.
  if (!userRes.user) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-10 md:py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle className="size-8 text-brand-gold" strokeWidth={1.5} />
            <p className="text-sm font-medium text-primary">Este enlace expiró o ya fue usado.</p>
            <p className="text-sm text-muted-foreground">Solicita uno nuevo para continuar.</p>
            <Link href="/forgot-password" className={buttonVariants({ size: "sm" })}>
              Solicitar nuevo enlace
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-10 md:py-16">
      <Card>
        <CardHeader>
          <CardTitle>Crea tu nueva contraseña</CardTitle>
          <CardDescription>Elige una contraseña que no hayas usado antes en Guardanza.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success ? (
            <>
              <Alert variant="success">
                <AlertDescription>Contraseña actualizada con éxito. Te llevamos a tu cuenta…</AlertDescription>
              </Alert>
              <AutoRedirect to="/" />
            </>
          ) : (
            <NewPasswordForm action={resetPassword} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
