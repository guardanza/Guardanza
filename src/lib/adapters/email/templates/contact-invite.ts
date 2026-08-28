import type { ContactInviteEmail } from "../types";

// Plantilla del correo de invitación — usada por resend.ts (mock.ts sigue
// sin tocar HTML, solo loguea texto). HTML con estilos inline y layout de
// tablas a propósito: es lo único que se renderiza bien en el universo real
// de clientes de correo (Gmail, Outlook, Apple Mail) — nada de Tailwind ni
// flexbox/grid acá, esos no llegan. Mobile-first: una sola columna, ancho
// máximo ~520px que se angosta solo en pantallas chicas, botón grande y
// fácil de tocar con el dedo — la mayoría de quienes reciben esto lo abren
// en el teléfono.
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatExpiry(expiresAt: Date): string {
  return expiresAt.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
}

export function contactInviteEmailHtml(message: ContactInviteEmail): string {
  // El logo se sirve desde el mismo origen que ya resuelve el link de
  // aceptar (siteOrigin(), armado en issueInviteOrLink) — nunca un dominio
  // hardcodeado, así que funciona igual en local y en producción sin
  // tocar nada acá.
  //
  // Acá SIEMPRE va la versión invertida (logo-shield-white.png: blanco +
  // verde claro #cfe6da), no la de color que usa el resto de la app — el
  // escudo a color queda invisible sobre el verde oscuro del encabezado.
  // Es un PNG rasterizado aparte del mismo SVG (src/components/logo.tsx
  // tiene el original), no un filtro CSS: los clientes de correo (sobre
  // todo Outlook de escritorio) no soportan filter/invert de forma
  // confiable.
  //
  // Encabezado en #14432f (verde oscuro de marca) a propósito, distinto
  // del botón más abajo (#1f7a4d, verde de acción) — mismo criterio que
  // el resto de la app: oscuro para el momento de marca, medio para la
  // acción.
  const origin = new URL(message.acceptUrl).origin;
  const logoUrl = `${origin}/logo-shield-white.png`;
  const expiresLabel = formatExpiry(message.expiresAt);
  const name = escapeHtml(message.contactFullName);
  const org = escapeHtml(message.organizationName);
  const role = escapeHtml(message.contactRoleLabel);

  return `<!doctype html>
<html lang="es-CL">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Te invitaron a Guardanza</title>
    <!-- Montserrat solo se ve en los clientes de correo que sí cargan
         fuentes web (Apple Mail, Gmail web, entre otros) — el resto
         (sobre todo Outlook de escritorio) cae directo al fallback
         Helvetica/Arial del font-family de abajo, sin romper nada. -->
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
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2c3e50;">
                  <strong>${org}</strong> te invitó a sumarte a Guardanza.
                </p>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#5a6b78;">
                  Guardanza es un lugar neutral donde se guarda la garantía de un contrato de arriendo mientras dura el
                  contrato — ni el arrendador ni el arrendatario la tienen por su cuenta: queda registrada y visible
                  para ambas partes hasta el término del contrato.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;">
                  <tr>
                    <td style="background-color:#f5ead9;border-radius:999px;padding:6px 14px;">
                      <span style="font-size:13px;font-weight:600;color:#8a6820;">Te invitaron como ${role}</span>
                    </td>
                  </tr>
                </table>
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
                        >Abrir invitación</a
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 32px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#7a8fa0;">
                  Este link vence el ${expiresLabel}. Si prefieres no aceptar, puedes entrar al link y rechazar la
                  invitación ahí mismo — no hace falta que respondas este correo.
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

// Alternativa en texto plano — Resend la manda junto al HTML (multipart),
// mejor entregabilidad y un respaldo legible para quien lea con el HTML
// desactivado.
export function contactInviteEmailText(message: ContactInviteEmail): string {
  const expiresLabel = formatExpiry(message.expiresAt);
  return [
    `Hola ${message.contactFullName},`,
    ``,
    `${message.organizationName} te invitó a sumarte a Guardanza.`,
    ``,
    `Guardanza es un lugar neutral donde se guarda la garantía de un contrato de arriendo mientras dura el contrato — ni el arrendador ni el arrendatario la tienen por su cuenta: queda registrada y visible para ambas partes hasta el término del contrato.`,
    ``,
    `Te invitaron como ${message.contactRoleLabel}.`,
    ``,
    `Abre la invitación acá: ${message.acceptUrl}`,
    ``,
    `Este link vence el ${expiresLabel}. Si prefieres no aceptar, puedes entrar al link y rechazar la invitación ahí mismo.`,
    ``,
    `Guardanza · custodia neutral de garantías de arriendo`,
  ].join("\n");
}
