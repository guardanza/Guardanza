// "admin" is scoped per-contacto (whoever created/administers THAT one),
// not a global platform admin — this label exists so the UI never just
// prints the bare enum value and lets people assume otherwise. The
// underlying DB concept is still "organizations" (schema/columns unchanged)
// — this is purely user-facing copy, chosen because "organización" reads
// as a company to most users even when it's a single individual landlord.
export function orgRoleLabel(role: string): string {
  return role === "admin" ? "administrador del contacto" : role;
}

export function orgTypeLabel(type: string): string {
  return type === "broker" ? "Corredora" : "Arrendador individual";
}

// signUpWithRole bakes " (particular)" into an individual landlord's own
// organization.name at signup time (auth.ts) so the Contactos list can
// tell a real company name from "this is just me, personally". That
// suffix is noise in a "quién es el arrendador de esta propiedad" picker
// — display-only strip, doesn't touch the stored name anywhere else it's
// shown on purpose (Contactos still wants it).
export function stripParticularSuffix(name: string): string {
  return name.replace(/ \(particular\)$/, "");
}
