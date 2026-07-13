// Without generated types (see database.types.ts), supabase-js can't always
// tell a singular embedded relation (contract -> one property) from a
// to-many one, so the shape it infers varies by call site. This normalizes
// either shape at runtime. Drop once `supabase gen types` gives us real
// relation types.
export function one<T>(relation: T | T[] | null | undefined): T | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}
