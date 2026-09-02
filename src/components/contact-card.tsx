import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { contactStatusLabel } from "@/components/contact-status-badge";
import { GreenCard, GreenChip } from "@/components/ui/green-card";
import { roleBucketLabel, type RoleBucket } from "@/lib/role-bucket";

// Extraído de app/contacts/page.tsx para que /estilos pueda mostrar
// exactamente esta tarjeta (mismo componente, no una copia a mano que
// se puede desincronizar) — ver ContactCardExample en app/estilos/page.tsx.
//
// Mismo verde de tarjeta que Candidatos (--brand-green-card, ver
// candidate-card.tsx y /estilos). "En Guardanza" usa el chip "on"
// (fondo casi blanco, texto verde oscuro, contraste 5.78:1); cualquier
// otro estado (pendiente, rechazada, sin ficha…) usa "pend" (blanco/35%,
// mismo texto oscuro — 4.87:1) — el mockup de referencia original usaba
// texto claro ahí y no llegaba a 3:1, se corrigió al construir esto.
export function ContactCard({
  role,
  contactKey,
  fullName,
  email,
  rut,
  avatarUrl,
  displayStatus,
  showRoleChip,
}: {
  role: RoleBucket;
  contactKey: string;
  fullName: string;
  email: string | null;
  rut: string | null;
  avatarUrl: string | null;
  displayStatus: string | null;
  showRoleChip: boolean;
}) {
  const isOn = displayStatus === "confirmado";
  const chipLabel = displayStatus ? contactStatusLabel(displayStatus) : "Sin ficha en tu libreta";

  return (
    <GreenCard className="relative flex items-center gap-2 p-3 transition-shadow hover:shadow-[0_4px_16px_rgba(20,67,47,0.26)]">
      {/* after:absolute after:inset-0 ("stretched link"): el <a> solo
          envuelve avatar+texto, pero su pseudo-elemento cubre toda la
          tarjeta (position:relative ya está en el div), así que el área
          tocable es la fila entera — blanco más grande, que es lo que
          conviene acá. El chevrón va como hermano con z-10 para quedar
          por encima de esa capa y seguir siendo clickeable; no puede ir
          dentro del <a> porque no se anida un botón en un enlace. */}
      <Link
        href={`/contacts/${role}/${encodeURIComponent(contactKey)}`}
        className="flex min-w-0 flex-1 items-center gap-3 after:absolute after:inset-0"
      >
        <UserAvatar
          avatarUrl={avatarUrl}
          name={fullName}
          size={44}
          className="border-2 border-white/25 bg-brand-green-card-deep text-white"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-[15px] font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.18)]">{fullName}</p>
          {(email || rut) && (
            <p className="truncate text-xs text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.18)]">{email ?? rut}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* El chip de rol solo cuando hay búsqueda: ahí la lista
                mezcla las 3 pestañas y sin él no se sabe de cuál viene
                cada fila. Sin búsqueda todas son del rol de la pestaña
                activa — repetirlo en cada tarjeta es ruido. */}
            {showRoleChip && <GreenChip tone="translucent">{roleBucketLabel(role)}</GreenChip>}
            <GreenChip tone={isOn ? "solid" : "translucent"}>{chipLabel}</GreenChip>
          </div>
        </div>
      </Link>
      {/* Sin menú de acciones acá — "Quitar"/"Reenviar" viven en la
          ficha de detalle (la flechita lleva ahí). Que haga falta entrar
          al contacto para encontrar "Quitar" es el punto: un paso más de
          intención antes de una acción destructiva, sin depender de un
          menú que igual había que abrir. */}
      <ChevronRight className="size-4 shrink-0 text-white/85" aria-hidden="true" />
    </GreenCard>
  );
}
