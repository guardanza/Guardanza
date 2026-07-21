import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SignupWizard } from "@/components/signup-wizard";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; legal_form?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (userRes.user) redirect("/");

  const { role, legal_form, error } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-10 md:py-16">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Crear cuenta</CardTitle>
          <CardDescription>Primero cuéntanos qué tipo de cuenta necesitas.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupWizard initialRole={role} initialLegalForm={legal_form} />
        </CardContent>
      </Card>
    </div>
  );
}
