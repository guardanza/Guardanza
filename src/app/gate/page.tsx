import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { unlockGate } from "@/lib/actions/gate";
import { GATE_COOKIE_NAME, gateTokenFor } from "@/lib/gate";
import { Logo } from "@/components/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  const expected = process.env.GATE_PASSWORD;
  if (expected) {
    const cookieStore = await cookies();
    if (cookieStore.get(GATE_COOKIE_NAME)?.value === gateTokenFor(expected)) redirect(next || "/");
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-6 flex justify-center">
        <Logo />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Acceso privado</CardTitle>
          <CardDescription>Guardanza todavía está en construcción. Ingresá la clave para continuar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={unlockGate} className="space-y-3">
            <input type="hidden" name="next" value={next || "/"} />
            <div className="space-y-1.5">
              <Label htmlFor="password">Clave</Label>
              <Input id="password" name="password" type="password" required autoFocus />
            </div>
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
