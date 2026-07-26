import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/password-reset";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResendCooldownButton } from "@/components/resend-cooldown-button";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  const sentAt = sent ? Number(sent) : null;

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-10 md:py-16">
      <Card>
        <CardHeader>
          <CardTitle>Recupera tu contraseña</CardTitle>
          <CardDescription>Ingresa tu email y te enviaremos un enlace para crear una nueva contraseña.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sentAt && (
            <Alert variant="success">
              <AlertDescription>
                Si el email está registrado, recibirás un enlace en unos minutos. Revisa tu bandeja de entrada y spam.
              </AlertDescription>
            </Alert>
          )}

          <form action={requestPasswordReset} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoFocus />
            </div>
            <ResendCooldownButton sentAt={sentAt}>Enviar enlace</ResendCooldownButton>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Volver a iniciar sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
