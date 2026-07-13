import { mockSignatureProvider } from "./mock";
import type { SignatureProvider } from "./types";

export type { SignatureEnvelopeResult, SignatureProvider } from "./types";

export const signatureProvider: SignatureProvider = mockSignatureProvider;
