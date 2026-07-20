import { signIn, signUp } from "@/lib/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Guardanza</h1>
        <p className="mt-1 text-sm text-muted-foreground">Fase A — demo simulado</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>Entra con tu cuenta existente.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signIn} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="signin-email">Email</Label>
              <Input id="signin-email" name="email" type="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signin-password">Contraseña</Label>
              <Input id="signin-password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Crear cuenta</CardTitle>
          <CardDescription>Regístrate por primera vez.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signUp} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="signup-name">Nombre completo</Label>
              <Input id="signup-name" name="full_name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-email">Email</Label>
              <Input id="signup-email" name="email" type="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password">Contraseña</Label>
              <Input id="signup-password" name="password" type="password" required minLength={6} />
            </div>
            <Button type="submit" variant="outline" className="w-full">
              Registrarme
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
