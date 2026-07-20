import { signIn, signUp } from "@/lib/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const timeline = [
  { label: "Contrato firmado", detail: "Ambas partes de acuerdo", done: true },
  { label: "Garantía en custodia", detail: "Registrada en el libro", done: true },
  { label: "Término de contrato", detail: "Se define la liquidación", done: false },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto grid min-h-screen max-w-5xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_1fr]">
      <div className="hidden lg:block">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">Guardanza</p>
        <h1 className="mt-2 max-w-md text-4xl font-bold tracking-tight text-balance">
          Arrienda con confianza.
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Arrendador, arrendatario y corredor ven lo mismo, al mismo tiempo. Sin sorpresas al
          terminar el contrato.
        </p>

        <Card className="mt-10 max-w-sm gap-0 py-4">
          {timeline.map((step, i) => (
            <div
              key={step.label}
              className={`flex items-center gap-3 px-5 py-3 ${i !== timeline.length - 1 ? "border-b" : ""}`}
            >
              <span
                className={
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold " +
                  (step.done ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground")
                }
              >
                {step.done ? "✓" : i + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.detail}</p>
              </div>
            </div>
          ))}
        </Card>

        <Badge variant="outline" className="mt-6 border-brand-terracotta/30 bg-brand-terracotta/10 text-brand-terracotta">
          🔒 Fondos neutrales, sin sesgo
        </Badge>
      </div>

      <div className="flex flex-col gap-6">
        <div className="text-center lg:hidden">
          <h1 className="text-2xl font-semibold tracking-tight">Guardanza</h1>
          <p className="mt-1 text-sm text-muted-foreground">Arrienda con confianza.</p>
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
    </div>
  );
}
