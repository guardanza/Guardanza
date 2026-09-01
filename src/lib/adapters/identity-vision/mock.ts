import type { IdentityVisionProvider, VisionCheckResult } from "./types";

// MOCK — Fase A only, y a propósito INERTE: todavía no hay proveedor de
// IA de visión decidido (falta resolver privacidad de datos biométricos
// además de la elección técnica), así que este mock NUNCA lee
// imageBytes, NUNCA hace una llamada de red, y siempre "pasa" — el
// corredor sigue siendo el filtro visual real mientras tanto (spec:
// "por ahora el corredor la valida a ojo"). No confundir con
// screening/mock.ts: acá NO se guarda ningún resultado, solo se llama
// desde uploadCandidateIdentityPhoto para dejar marcado el punto exacto
// donde después se conecta la validación real.
//
// Cuando haya proveedor: cambiar SOLO este archivo (nunca los
// callers — mismo seam que ya usan email/resend.ts y
// screening/mock.ts), y ahí sí definir qué pasa con un resultado
// passed:false (¿bloquea? ¿solo avisa al corredor?) — decisión de
// producto pendiente, no de este archivo.
async function pass(): Promise<VisionCheckResult> {
  return { passed: true };
}

export const mockIdentityVisionProvider: IdentityVisionProvider = {
  checkDocumentPhoto: () => pass(),
  checkSelfieWithDocument: () => pass(),
};
