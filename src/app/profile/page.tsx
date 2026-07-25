import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileTypeLabel } from "@/lib/profile-label";
import { getAuthProvider } from "@/lib/auth-provider";
import { updateProfile } from "@/lib/actions/profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/profile-form";
import { SavedIndicator } from "@/components/saved-indicator";
import { AvatarPicker } from "@/components/avatar-picker";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; highlight?: string }>;
}) {
  const { error, next, highlight } = await searchParams;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userRes.user.id).single();
  const profileType = await getProfileTypeLabel(supabase, userRes.user.id);
  const provider = getAuthProvider(userRes.user);

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6 md:px-6 md:py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Perfil</h1>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{userRes.user.email}</p>
          <Badge variant="outline">{profileType}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foto de perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarPicker avatarUrl={profile?.avatar_url ?? null} name={profile?.full_name ?? userRes.user.email ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Datos personales</CardTitle>
            <CardDescription>Tu RUT se valida automáticamente.</CardDescription>
          </div>
          <Suspense fallback={null}>
            <SavedIndicator />
          </Suspense>
        </CardHeader>
        <CardContent>
          <ProfileForm
            action={updateProfile}
            provider={provider}
            initialFullName={profile?.full_name ?? ""}
            initialRut={profile?.rut ?? ""}
            initialPhone={profile?.phone ?? ""}
            rutHighlighted={highlight === "rut"}
            next={next}
          />
        </CardContent>
      </Card>
    </div>
  );
}
