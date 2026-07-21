import type { SignatureEnvelopeResult, SignatureProvider } from "./types";

// MOCK — Fase A only. No real e-signature provider is called; the actual
// signature_envelopes row is written by the sign_contract_landlord() /
// sign_contract_tenant() Postgres functions
// (supabase/migrations/20260721190001_contract_state_machine.sql), which
// hardcode provider='mock' themselves. This adapter exists so route handlers
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
