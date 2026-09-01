import { ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

// "confirmado"/"pendiente" a secas no dicen nada de un vistazo — lo que
// realmente comunican es si esa persona ya tiene cuenta creada en
// Guardanza o todavía no. Acá se traduce a texto claro; rol_distinto y
// expirada (estados derivados, no del enum contact_status) se muestran
// tal cual los resuelve StatusBadge, sin tocarlos — esto es solo sobre
// los dos estados de cuenta.
//
// "invitacion_rechazada" NO se le pasa a StatusBadge tal cual — la clave
// "rechazada" ya existe ahí, pero en rojo (la usan disputas/propuestas,
// donde sí es una alarma real). Acá un rechazo no es un error, es un
// resultado — mismo criterio que ya vale para "pendiente"/"expirada":
// gris apagado, nunca rojo. Por eso esta rama pasa su propio className,
// sin tocar el mapeo compartido de status-badge.tsx (rompería el rojo en
// los otros dominios que sí lo necesitan).
// Extraído para que la tarjeta verde de Contactos (misma familia visual
// que Candidatos, ver candidate-card.tsx) pueda usar exactamente el
// mismo texto sin duplicar el mapeo — el color ahí es otro (ver
// ContactCardChip, más abajo), pero la palabra tiene que ser la misma.
export function contactStatusLabel(status: string): string {
  if (status === "confirmado") return "En Guardanza";
  if (status === "pendiente") return "Invitación pendiente";
  if (status === "invitacion_rechazada") return "Invitación rechazada";
  return status.replace(/_/g, " ");
}

export function ContactStatusBadge({ status }: { status: string }) {
  if (status === "confirmado") return <StatusBadge status={status} label={contactStatusLabel(status)} icon={ShieldCheck} />;
  if (status === "pendiente") return <StatusBadge status={status} label={contactStatusLabel(status)} />;
  if (status === "invitacion_rechazada") {
    return <StatusBadge status={status} label={contactStatusLabel(status)} className="bg-muted text-muted-foreground" />;
  }
  return <StatusBadge status={status} />;
}
