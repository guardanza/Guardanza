import type { SignatureEnvelopeResult, SignatureProvider } from "./types";

// MOCK — Fase A only. No real e-signature provider is called; the actual
// signature_envelopes row is written by the sign_contract() Postgres
// function (supabase/migrations/20260709200026_fn_sign_contract.sql), which
// hardcodes provider='mock' itself. This adapter exists so route handlers
// have a single place to call when Fase B swaps in a real provider (e.g.
// FirmaVirtual, DocuSign) — the route code won't need to change shape.
export const mockSignatureProvider: SignatureProvider = {
  async sign(contractId: string, signedByUserId: string): Promise<SignatureEnvelopeResult> {
    return {
      provider: "mock",
      status: "completado",
      evidence: { contractId, signedByUserId, signedAt: new Date().toISOString() },
    };
  },
};
