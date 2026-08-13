import { createClient } from "@/lib/supabase/server";
import { findUserIdByEmail } from "@/lib/supabase/find-user-by-email";
import { roleBucketLabel, type RoleBucket } from "@/lib/role-bucket";
import { acceptContactInvite, linkExistingAccountInvite } from "@/lib/actions/contact-invites";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordInput } from "@/components/password-input";
import { RutInput } from "@/components/rut-input";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: invite } = await supabase
    .rpc("resolve_contact_invite", { p_token: token })
    .maybeSingle<{
      contact_id: string;
      full_name: string;
      email: string;
      rut: string | null;
      contact_role: RoleBucket;
      organization_name: string;
    }>();

  if (!invite) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Invitación no válida</CardTitle>
            <CardDescription>
              Este link ya no funciona — puede haber vencido, haberse usado, o haberse reemplazado por uno más nuevo.
              Pídele a quien te invitó que te reenvíe la invitación desde su libreta de contactos.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const existingUserId = await findUserIdByEmail(invite.email);

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Te invitaron a Guardanza</CardTitle>
          <CardDescription>
            {invite.organization_name} te agregó a sus contactos como {roleBucketLabel(invite.contact_role)}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {existingUserId ? (
            <form action={linkExistingAccountInvite} className="space-y-3">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="email" value={invite.email} />
              <p className="text-sm text-muted-foreground">
                Ya existe una cuenta de Guardanza con el email <strong>{invite.email}</strong>. Confirma para vincularla a
                este contacto.
              </p>
              <Button type="submit" className="w-full">
                Confirmar
              </Button>
            </form>
          ) : (
            <form action={acceptContactInvite} className="space-y-3">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="email" value={invite.email} />
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={invite.email} disabled />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input id="full_name" name="full_name" defaultValue={invite.full_name} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rut">RUT</Label>
                <RutInput id="rut" defaultValue={invite.rut ?? ""} required placeholder="11.111.111-1" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <PasswordInput id="password" name="password" required />
                <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, una mayúscula y un número.</p>
              </div>
              <Button type="submit" className="w-full">
                Crear cuenta y confirmar
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
