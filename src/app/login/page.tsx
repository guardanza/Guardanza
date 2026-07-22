import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (userRes.user) redirect("/");

  const { error } = await searchParams;

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
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

        <Badge variant="outline" className="mt-6 border-brand-gold/30 bg-brand-gold/10 text-accent-foreground">
          🔒 Fondos neutrales, sin sesgo
        </Badge>
      </div>

      <div className="flex flex-col gap-4">
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
            <LoginForm startExpanded={Boolean(error)} />
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
