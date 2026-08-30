// Fuente única de los 3 tonos de mensaje (spec sección 4) — cálido para
// el titular, tono bajo y explícito para el codeudor (advertencia real
// de responsabilidad, no letra chica), neutro para el coarrendatario.
// Se usa tanto en la pantalla de aterrizaje (/evaluacion/[token]) como
// en el correo de invitación — que ambos digan exactamente lo mismo
// importa más acá que en cualquier otro mensaje de la app: es lo único
// que un codeudor lee antes de asumir una responsabilidad legal.
export type CandidateParticipantType = "titular" | "codeudor" | "coarrendatario";

export function participantInviteTitle(type: CandidateParticipantType): string {
  switch (type) {
    case "titular":
      return "Presenta tus papeles";
    case "codeudor":
      return "Te invitaron como codeudor(a) solidario(a)";
    case "coarrendatario":
      return "Te invitaron como coarrendatario(a)";
  }
}

export function participantInviteMessage(type: CandidateParticipantType, ctx: { propertyAddress: string; inviterName: string }): string {
  switch (type) {
    case "titular":
      return `${ctx.inviterName} te invitó a presentar tus antecedentes para arrendar ${ctx.propertyAddress}. Te toma unos minutos.`;
    case "codeudor":
      return `${ctx.inviterName} te invitó como codeudor(a) solidario(a) de su postulación a ${ctx.propertyAddress}. Si el titular no paga el arriendo, a ti también te pueden cobrar — antes de avanzar, es importante que lo tengas claro.`;
    case "coarrendatario":
      return `${ctx.inviterName} te invitó a postular junto con su candidatura a ${ctx.propertyAddress}, como coarrendatario(a) — ambos responden por igual ante el arriendo.`;
  }
}
