import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileTypeLabel } from "@/lib/profile-label";
import { ChooseRoleForm } from "@/components/choose-role-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

// A donde el callback de Google manda a cualquier cuenta que quedó
// autenticada sin ningún rol — típicamente un email nuevo que entró por
// el botón de Google de /login en vez de /signup. Si de alguna forma
// alguien con rol ya asentado llega acá igual (por ejemplo, navegación
// directa a la URL), no tiene nada que elegir — se lo manda al Dashboard.
export default async function ChooseRolePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const profileType = await getProfileTypeLabel(supabase, userRes.user.id);
  if (profileType !== "Sin rol definido") redirect("/");

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>¿Qué tipo de cuenta necesitas?</CardTitle>
          <CardDescription>Ya iniciaste sesión — solo falta elegir cómo vas a usar Guardanza.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChooseRoleForm />
        </CardContent>
      </Card>
    </div>
  );
}
