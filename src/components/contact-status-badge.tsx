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
export function ContactStatusBadge({ status }: { status: string }) {
  if (status === "confirmado") return <StatusBadge status={status} label="En Guardanza" icon={ShieldCheck} />;
  if (status === "pendiente") return <StatusBadge status={status} label="Invitación pendiente" />;
  if (status === "invitacion_rechazada") {
    return <StatusBadge status={status} label="Invitación rechazada" className="bg-muted text-muted-foreground" />;
  }
  return <StatusBadge status={status} />;
}
