// "admin" is scoped per-organización (whoever created/administers THAT
// one), not a global platform admin — this label exists so the UI never
// just prints the bare enum value and lets people assume otherwise. The
// underlying DB concept is still "organizations" (schema/columns
// unchanged) — this is purely user-facing copy, matching the "Mi negocio"
// section name it's shown under.
export function orgRoleLabel(role: string): string {
  return role === "admin" ? "administrador del negocio" : role;
}

export function orgTypeLabel(type: string): string {
  return type === "broker" ? "Corredora" : "Arrendador individual";
}

// signUpWithRole bakes " (particular)" into an individual landlord's own
// organization.name at signup time (auth.ts) so the Mi negocio list can
// tell a real company name from "this is just me, personally". That
// suffix is noise in a "quién es el arrendador de esta propiedad" picker
// — display-only strip, doesn't touch the stored name anywhere else it's
// shown on purpose (Mi negocio still wants it).
export function stripParticularSuffix(name: string): string {
  return name.replace(/ \(particular\)$/, "");
}

// Nombres con un apodo o aclaración entre paréntesis ("Juan (el del
// depto 302)") se ven bien en una lista de contactos densa, pero no en
// una tarjeta grande donde el nombre es lo primero que se lee — display-
// only, no toca el nombre guardado.
export function cleanDisplayName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
