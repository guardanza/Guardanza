import "server-only";
import { Resend } from "resend";
import type { EmailProvider, ContactInviteEmail, CandidateParticipantInviteEmail } from "./types";
import { contactInviteEmailHtml, contactInviteEmailText } from "./templates/contact-invite";
import { candidateParticipantInviteEmailHtml, candidateParticipantInviteEmailText } from "./templates/candidate-participant-invite";

// Envío real vía Resend — dominio guardanza.app ya verificado ahí.
// `server-only` (mismo guardia que usa service-role.ts para
// SUPABASE_SERVICE_ROLE_KEY) hace que sea un error de build si algo
// intentara importar este archivo desde un bundle de cliente.
//
// El cliente de Resend se crea DENTRO de sendContactInvite, no arriba a
// nivel de módulo — el constructor de Resend lanza una excepción de
// inmediato si no hay API key ("Missing API key"). index.ts importa este
// archivo siempre (para tener resendEmailProvider disponible), incluso
// cuando termina usando el mock — si el `new Resend(...)` viviera acá
// arriba, esa sola importación tumbaría la app entera en local (sin
// RESEND_API_KEY seteada, por decisión del equipo: la key vive solo en
// Vercel). Instanciarlo perezosamente adentro de la función hace que el
// constructor solo corra cuando este provider de verdad se usa — y eso
// solo pasa cuando la key existe (ver el ternario en index.ts).
export const resendEmailProvider: EmailProvider = {
  async sendContactInvite(message: ContactInviteEmail): Promise<void> {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "Guardanza <no-responder@guardanza.app>",
      to: message.to,
      subject: `${message.organizationName} te invitó a Guardanza`,
      html: contactInviteEmailHtml(message),
      text: contactInviteEmailText(message),
    });
    if (error) throw new Error(`Resend: ${error.message}`);
  },

  async sendCandidateParticipantInvite(message: CandidateParticipantInviteEmail): Promise<void> {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "Guardanza <no-responder@guardanza.app>",
      to: message.to,
      subject: "Guardanza — evaluación de papeles",
      html: candidateParticipantInviteEmailHtml(message),
      text: candidateParticipantInviteEmailText(message),
    });
    if (error) throw new Error(`Resend: ${error.message}`);
  },
};
