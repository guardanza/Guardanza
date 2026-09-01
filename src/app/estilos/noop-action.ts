"use server";

// Server action de utilería, solo para /estilos: CandidateCard pide
// funciones reales (formData) => void para sus tres formularios
// (enviar/reenviar evaluación, descartar, reactivar) — acá no hay un
// candidato real detrás, así que esta acción no hace nada. Nunca toca la
// base de datos.
export async function noopAction(_formData: FormData) {}
