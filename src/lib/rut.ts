// Chilean RUT check-digit validation (módulo 11). Accepts with or without
// dots/dashes; returns false for anything that doesn't pass the checksum,
// not just malformed input — this is meant to catch typos and fabricated
// RUTs, not just enforce a shape.
export function cleanRut(rut: string): string {
  return rut.replace(/[.\s]/g, "").toUpperCase();
}

export function validateRut(rut: string): boolean {
  const clean = cleanRut(rut);
  const match = clean.match(/^(\d{1,8})-?([\dK])$/);
  if (!match) return false;

  const [, body, dv] = match;
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  const expectedDv = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return expectedDv === dv;
}

export function formatRut(rut: string): string {
  const clean = cleanRut(rut).replace("-", "");
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}
