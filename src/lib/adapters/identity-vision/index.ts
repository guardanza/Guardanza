import { mockIdentityVisionProvider } from "./mock";
import type { IdentityVisionProvider } from "./types";

export type { IdentityVisionProvider, VisionCheckResult } from "./types";

// Single seam for swapping the real provider later (proveedor de IA de
// visión aún no decidido — falta resolver privacidad de datos
// biométricos, no solo la elección técnica). Todos los callers importan
// identityVisionProvider desde acá — nunca mock.ts directamente. Hoy
// siempre es el mock: no hay ninguna rama por variable de entorno como
// sí tiene email/index.ts (RESEND_API_KEY), porque todavía no existe
// nada real que activar.
export const identityVisionProvider: IdentityVisionProvider = mockIdentityVisionProvider;
