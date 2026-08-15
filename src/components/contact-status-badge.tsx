import { ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

// "confirmado"/"pendiente" a secas no dicen nada de un vistazo — lo que
// realmente comunican es si esa persona ya tiene cuenta creada en
// Guardanza o todavía no. Acá se traduce a texto claro; rol_distinto y
// expirada (estados derivados, no del enum contact_status) se muestran
// tal cual los resuelve StatusBadge, sin tocarlos — esto es solo sobre
// los dos estados de cuenta.
export function ContactStatusBadge({ status }: { status: string }) {
  if (status === "confirmado") return <StatusBadge status={status} label="En Guardanza" icon={ShieldCheck} />;
  if (status === "pendiente") return <StatusBadge status={status} label="Invitación pendiente" />;
  return <StatusBadge status={status} />;
}
