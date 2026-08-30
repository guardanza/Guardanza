import { createClient } from "@/lib/supabase/server";
import { findUserIdByEmail } from "@/lib/supabase/find-user-by-email";
import { linkExistingAccountCandidateParticipant, acceptCandidateParticipantInvite } from "@/lib/actions/candidate-participant-invites";
import { participantInviteTitle, participantInviteMessage, type CandidateParticipantType } from "@/lib/candidate-participant-messaging";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordInput } from "@/components/password-input";
import { cn } from "@/lib/utils";

export default async function CandidateParticipantInvitePage({
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
    .rpc("resolve_candidate_participant_invite", { p_token: token })
    .maybeSingle<{
      candidate_participant_id: string;
      participant_type: CandidateParticipantType;
      full_name: string;
      email: string;
      property_address: string;
      inviter_name: string;
    }>();

  if (!invite) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Este link ya no es válido</CardTitle>
            <CardDescription>
              Puede haber vencido, haberse usado, o haberse reemplazado por uno más nuevo. Pídele a quien te invitó
              que te lo reenvíe.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const existingUserId = await findUserIdByEmail(invite.email);
  const isCodeudor = invite.participant_type === "codeudor";
  const message = participantInviteMessage(invite.participant_type, {
    propertyAddress: invite.property_address,
    inviterName: invite.inviter_name,
  });

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{participantInviteTitle(invite.participant_type)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* El tono del codeudor se destaca con el mismo dorado que el
              resto de la app usa para avisos importantes — no es un
              error, pero sí algo que hay que leer con atención antes
              de avanzar, spec sección 4. */}
          <p
            className={cn(
              "text-sm leading-relaxed",
              isCodeudor ? "rounded-lg border border-brand-gold/40 bg-brand-gold/5 p-3 text-foreground" : "text-muted-foreground"
            )}
          >
            {message}
          </p>

          {existingUserId ? (
            <form action={linkExistingAccountCandidateParticipant} className="space-y-3">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="email" value={invite.email} />
              <p className="text-sm text-muted-foreground">
                Ya existe una cuenta de Guardanza con el email <strong>{invite.email}</strong>. Confirma para
                vincularla a esta postulación.
              </p>
              <Button type="submit" className="w-full">
                Confirmar
              </Button>
            </form>
          ) : (
            <form action={acceptCandidateParticipantInvite} className="space-y-3">
              <input type="hidden" name="token" value={token} />
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={invite.email} disabled />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input id="full_name" name="full_name" defaultValue={invite.full_name} required />
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
