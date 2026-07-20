// "admin" is scoped per-participante (whoever created/administers THAT
// one), not a global platform admin — this label exists so the UI never
// just prints the bare enum value and lets people assume otherwise. The
// underlying DB concept is still "organizations" (schema/columns unchanged)
// — this is purely user-facing copy, chosen because "organización" reads
// as a company to most users even when it's a single individual landlord.
export function orgRoleLabel(role: string): string {
  return role === "admin" ? "administrador del participante" : role;
}

export function orgTypeLabel(type: string): string {
  return type === "broker" ? "Corredora" : "Arrendador individual";
}
