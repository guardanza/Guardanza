export interface SignatureEnvelopeResult {
  provider: string;
  status: "pendiente" | "completado" | "cancelado";
  evidence: Record<string, unknown>;
}

export interface SignatureProvider {
  /** Create and immediately resolve a signature envelope for a contract. */
  sign(contractId: string, signedByUserId: string): Promise<SignatureEnvelopeResult>;
}
