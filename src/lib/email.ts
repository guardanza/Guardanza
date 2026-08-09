// Validación liviana de forma (no verifica que el dominio exista de
// verdad) — alcanza para decidir UI (¿lo que se buscó en Mis Contactos
// es un email?) y como último resguardo server-side antes de invitar. La
// validación de "esta cuenta ya existe" la sigue haciendo
// findUserIdByEmail contra auth.users, no esto.
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// Nombre provisional para una invitación rápida por email, sin pedirle a
// quien invita que tipee nada más. Igual que en el resto de la libreta,
// el nombre real lo define la PERSONA cuando confirma su cuenta — esto
// es solo una etiqueta legible mientras tanto.
export function deriveNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const words = local
    .replace(/[._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return email;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
