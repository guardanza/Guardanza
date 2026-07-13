import type { ScreeningProvider, ScreeningResult } from "./types";

// MOCK — Fase A only. No real Equifax/SII integration. Always returns
// 'verde' so the demo flow never blocks on a screening result. Swap this
// module for a real provider later; callers only ever depend on
// ScreeningProvider (types.ts).
export const mockScreeningProvider: ScreeningProvider = {
  async check(_rut: string): Promise<ScreeningResult> {
    return { status: "verde", checkedAt: new Date() };
  },
};
