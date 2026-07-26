// Mirrors the public.contract_role Postgres enum ('arrendador',
// 'arrendatario', 'corredor') — kept as a plain union since
// database.types.ts is an unpopulated stub in this project (no generated
// types), not because these values are expected to drift independently.
export type RoleBucket = "arrendador" | "arrendatario" | "corredor";

// getProfileTypeLabel() returns one of five human labels ("Administrador de
// plataforma", "Corredor(a)", "Arrendador(a)", "Arrendatario(a)", "Sin rol
// definido"); role-change requests only ever target one of the three
// contract-participant roles, so both "Arrendatario(a)" and "sin rol
// definido" collapse to the same bucket — a user with no role yet requests
// exactly like a tenant would.
export function labelToRoleBucket(label: string): RoleBucket {
  if (label === "Corredor(a)") return "corredor";
  if (label === "Arrendador(a)") return "arrendador";
  return "arrendatario";
}

export function roleBucketLabel(bucket: RoleBucket): string {
  if (bucket === "corredor") return "corredor(a)";
  if (bucket === "arrendador") return "arrendador(a)";
  return "arrendatario(a)";
}
