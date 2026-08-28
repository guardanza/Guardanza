import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

// Aterrizaje al aceptar una invitación de contacto y crear la cuenta
// (acceptContactInvite redirige acá en vez de a "/" a secas) — antes se
// dejaba a la persona suelta en el dashboard vacío, sin ningún "listo,
// ya estás dentro". Solo esto por ahora: saludo + sesión ya abierta (la
// deja acceptContactInvite) + guiarla a completar su perfil. El
// recorrido guiado según el rol es a futuro, no acá.
//
// linkExistingAccountInvite (la persona YA tenía cuenta, solo se vincula
// el contacto) sigue mandando a /login?confirmed=1 sin pasar por acá —
// no crea sesión nueva ni cuenta nueva, no hay nada que "recibir".
export default async function BienvenidaPage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userRes.user.id).maybeSingle();
  const firstName = (profile?.full_name ?? "").trim().split(/\s+/)[0] || null;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-success/15">
            <ShieldCheck className="size-6 text-success" strokeWidth={2} />
          </div>
          <CardTitle className="text-xl">{firstName ? `¡Ya eres parte de Guardanza, ${firstName}!` : "¡Ya eres parte de Guardanza!"}</CardTitle>
          <CardDescription>
            Tu cuenta quedó lista y tu sesión ya está abierta. Completa tus datos para que todo funcione bien desde tu
            primer contrato.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Link href="/profile" className={buttonVariants({ className: "w-full" })}>
            Completar mi perfil
          </Link>
          <Link href="/" className={buttonVariants({ variant: "outline", className: "w-full" })}>
            Ir al inicio
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
