// Chilean money formatting/parsing shared across the app — CLP has no
// decimals (Chilean pesos aren't subdivided), UF always shows 2 decimals
// (it's a real fraction-bearing indexed unit). Central so every money
// input/display in the app (properties today, contracts later) uses the
// same $/UF and thousand-separator convention instead of each form
// reinventing it slightly differently.
export type MoneyCurrency = "CLP" | "UF";

// Read-only display, e.g. for a detail page: "$1.250.000" / "UF 1.250,50".
export function formatMoney(amount: number, currency: MoneyCurrency): string {
  if (currency === "UF") {
    return `UF ${amount.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${Math.round(amount).toLocaleString("es-CL")}`;
}

// Keeps only digits and, when allowed, a single decimal separator —
// accepts both "," and "." while typing (matches how people actually type
// on a Chilean keyboard vs. a numeric one) and normalizes to ".".
export function digitsOnly(value: string, allowDecimals: boolean): string {
  if (!allowDecimals) return value.replace(/[^\d]/g, "");
  let seenSeparator = false;
  let result = "";
  for (const ch of value) {
    if (/\d/.test(ch)) {
      result += ch;
    } else if ((ch === "," || ch === ".") && !seenSeparator) {
      result += ".";
      seenSeparator = true;
    }
  }
  return result;
}

// Formats a raw numeric string (as produced by digitsOnly) for display
// while typing: dots as thousand separators, comma as decimal separator.
export function formatMoneyInputDisplay(raw: string, allowDecimals: boolean): string {
  if (!raw) return "";
  const [intPart, decPart] = raw.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return allowDecimals && decPart !== undefined ? `${grouped},${decPart}` : grouped;
}
