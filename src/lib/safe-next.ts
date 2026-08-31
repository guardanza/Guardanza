// Valida un destino de redirect que viene de la URL/formulario — solo
// rutas propias (empieza con "/", nunca "//": protocol-relative sería
// salir del sitio). Antes vivía duplicado dentro de contacts.ts; ahora
// que auth.ts (signIn, para volver a /evaluacion/postulacion/[id] tras
// iniciar sesión) también lo necesita, queda acá como la única fuente.
export function safeNext(next: string): string | null {
  return /^\/(?!\/)/.test(next) ? next : null;
}
