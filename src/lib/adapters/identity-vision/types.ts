export interface VisionCheckResult {
  passed: boolean;
  reason?: string;
}

export interface IdentityVisionProvider {
  /**
   * ¿La foto parece un documento de identidad de verdad (cédula o
   * pasaporte), no cualquier otra cosa? Hoy nada la llama a bloquear
   * nada — ver el comentario en mock.ts.
   */
  checkDocumentPhoto(imageBytes: Uint8Array): Promise<VisionCheckResult>;

  /**
   * ¿La selfie parece una cara humana junto a un documento de
   * identidad? Mismo criterio que checkDocumentPhoto — no bloquea hoy.
   */
  checkSelfieWithDocument(imageBytes: Uint8Array): Promise<VisionCheckResult>;
}
