import type { CandidateParticipantInviteEmail } from "../types";
import { participantInviteMessage } from "@/lib/candidate-participant-messaging";

// Mismo molde que contact-invite.ts (tablas + estilos inline, el único
// HTML que se renderiza bien en todo el universo real de clientes de
// correo) — acá lo distinto es el TONO del cuerpo, no la estructura.
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatExpiry(expiresAt: Date): string {
  return expiresAt.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
}

export function candidateParticipantInviteEmailHtml(message: CandidateParticipantInviteEmail): string {
  const origin = new URL(message.acceptUrl).origin;
  const logoUrl = `${origin}/logo-shield-white.png`;
  const expiresLabel = formatExpiry(message.expiresAt);
  const name = escapeHtml(message.participantFullName);
  const body = escapeHtml(
    participantInviteMessage(message.participantType, { propertyAddress: message.propertyAddress, inviterName: message.inviterName })
  );
  // El mensaje del codeudor lleva la advertencia de responsabilidad — se
  // destaca con el mismo tono dorado que el resto de la app usa para
  // avisos importantes (no un error, pero sí algo que hay que leer con
  // atención antes de seguir). Titular y coarrendatario van en texto
  // plano, sin destacar — no hay nada que advertir de más.
  const highlightCodeudor = message.participantType === "codeudor";

  return `<!doctype html>
<html lang="es-CL">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Guardanza — Evaluación de papeles</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet" />
  </head>
  <body style="margin:0;padding:0;background-color:#f5ead9;font-family:'Montserrat',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5ead9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td align="center" style="background-color:#14432f;padding:28px 24px;">
                <img src="${logoUrl}" width="48" height="51" alt="Guardanza" style="display:block;margin:0 auto 8px;border:0;" />
                <span style="color:#fafbfc;font-size:14px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Guardanza</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 8px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#2c3e50;">Hola ${name},</p>
                ${
                  highlightCodeudor
                    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:#f5ead9;border-radius:12px;">
                         <tr><td style="padding:16px;">
                           <p style="margin:0;font-size:15px;line-height:1.6;color:#5a3f0f;">${body}</p>
                         </td></tr>
                       </table>`
                    : `<p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#2c3e50;">${body}</p>`
                }
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 28px 8px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="background-color:#1f7a4d;border-radius:10px;">
                      <a
                        href="${message.acceptUrl}"
                        style="display:inline-block;padding:14px 40px;font-size:16px;font-weight:600;color:#fafbfc;text-decoration:none;"
                        >Presentar mis papeles</a
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 32px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#7a8fa0;">
                  Este link vence el ${expiresLabel}.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background-color:#fafbfc;border-top:1px solid #e8ebf0;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#7a8fa0;text-align:center;">
                  Guardanza · custodia neutral de garantías de arriendo<br />
                  Si no esperabas este correo, puedes ignorarlo con confianza.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function candidateParticipantInviteEmailText(message: CandidateParticipantInviteEmail): string {
  const expiresLabel = formatExpiry(message.expiresAt);
  const body = participantInviteMessage(message.participantType, {
    propertyAddress: message.propertyAddress,
    inviterName: message.inviterName,
  });
  return [
    `Hola ${message.participantFullName},`,
    ``,
    body,
    ``,
    `Presenta tus papeles acá: ${message.acceptUrl}`,
    ``,
    `Este link vence el ${expiresLabel}.`,
    ``,
    `Guardanza · custodia neutral de garantías de arriendo`,
  ].join("\n");
}
