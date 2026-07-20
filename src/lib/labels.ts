// "admin" is scoped per-organization (whoever created/administers THAT
// org), not a global platform admin — this label exists so the UI never
// just prints the bare enum value and lets people assume otherwise.
export function orgRoleLabel(role: string): string {
  return role === "admin" ? "administrador de organización" : role;
}
