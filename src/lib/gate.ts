import { createHash } from "crypto";

// Shared between the "use server" action (sets the cookie) and proxy.ts
// (reads it on every request) — kept out of both so neither has to import
// from the other. The cookie never holds the plaintext password, just a
// hash of it, so reading the cookie alone doesn't reveal the password.
export const GATE_COOKIE_NAME = "gate_token";

export function gateTokenFor(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}
