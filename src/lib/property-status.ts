export type ContractBlockingReason = "en_proceso" | "en_custodia";

// Mismo criterio en dos lugares (ficha de propiedad y lista): dado un
// contrato "vivo" (cualquier status salvo finalizado/cancelado — eso ya
// se filtra antes de llamar a esto), categoriza por qué bloquea marcar
// la propiedad fuera de cartera. pay_guarantee() mueve el contrato a
// 'activo' y la garantía a 'en_custodia' juntos, en la misma transacción
// (fn_pay_guarantee/contract_state_machine) — así que el status del
// contrato alcanza para saber si la garantía ya llegó a custodia, sin
// necesitar consultar guarantees aparte. Mismo criterio que ya aplica
// set_property_inactive() en la base al validar esto mismo.
export function categorizeBlockingContract(status: string): ContractBlockingReason {
  return status === "activo" || status === "propuesta_termino" || status === "en_disputa" ? "en_custodia" : "en_proceso";
}
