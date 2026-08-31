import type { EmailProvider, ContactInviteEmail, CandidateParticipantInviteEmail } from "./types";

// MOCK — Fase A only. No real Resend/SMTP integration. Logs to the server
// console instead of sending anything, so a developer can find the accept
// link during local testing (this never goes through Supabase Auth's own
// mailer/Inbucket — it's a fully custom email, unrelated to auth emails).
// Swap this module for a real provider later; callers only ever depend on
// EmailProvider (types.ts).
export const mockEmailProvider: EmailProvider = {
  async sendContactInvite(message: ContactInviteEmail): Promise<void> {
    console.log(
      `[email:mock] Invitación de contacto para ${message.to} — ` +
        `${message.contactFullName} (${message.contactRoleLabel}) invitado por ${message.organizationName}. ` +
        `Link: ${message.acceptUrl} — vence ${message.expiresAt.toISOString()}`
    );
  },

  async sendCandidateParticipantInvite(message: CandidateParticipantInviteEmail): Promise<void> {
    console.log(
      `[email:mock] Evaluación de papeles para ${message.to} — ` +
        `${message.participantFullName} (${message.participantType}) invitado por ${message.inviterName} ` +
        `para ${message.propertyAddress}. Link: ${message.acceptUrl} — vence ${message.expiresAt.toISOString()}`
    );
  },
};
