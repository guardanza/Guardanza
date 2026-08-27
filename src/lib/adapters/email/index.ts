import { mockEmailProvider } from "./mock";
import { resendEmailProvider } from "./resend";
import type { EmailProvider } from "./types";

export type { EmailProvider, ContactInviteEmail } from "./types";

// Single seam for swapping the email sender later (Resend). Every caller
// imports `emailProvider` from here — never mock.ts/resend.ts directamente.
//
// Sin RESEND_API_KEY seteada, cae al mock — decisión explícita del equipo:
// la key vive solo en Vercel, nunca en una máquina local, así que en
// desarrollo el correo real nunca sale (se sigue viendo en la consola,
// como siempre). En cuanto la variable exista en el entorno (hoy: solo
// producción), los correos salen de verdad por Resend sin tocar nada más
// del flujo de invitación — todos los callers siguen dependiendo solo de
// EmailProvider (types.ts).
export const emailProvider: EmailProvider = process.env.RESEND_API_KEY ? resendEmailProvider : mockEmailProvider;
