import { mockEmailProvider } from "./mock";
import type { EmailProvider } from "./types";

export type { EmailProvider, ContactInviteEmail } from "./types";

// Single seam for swapping the email sender later (Resend). Every caller
// imports `emailProvider` from here — never mock.ts directly. Enchufar
// Resend real es agregar resend.ts implementando EmailProvider y cambiar
// esta única línea; nada más del flujo de invitación cambia.
export const emailProvider: EmailProvider = mockEmailProvider;
