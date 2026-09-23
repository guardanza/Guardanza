import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { contactStatusLabel } from "@/components/contact-status-badge";
import { roleBucketLabel, type RoleBucket } from "@/lib/role-bucket";
import { cn } from "@/lib/utils";

// Extraído de app/contacts/page.tsx para que /estilos pueda mostrar
// exactamente esta tarjeta (mismo componente, no una copia a mano que
// se puede desincronizar) — ver /estilos.
//
// Tarjeta blanca (sistema carbón + dorado — el sistema verde anterior
// se retiró). "En Guardanza" es un hecho positivo real → verde
// funcional de éxito, no dorado (el dorado es marca, no significado).
// Pendiente/rechazada/sin ficha → gris neutro, nunca rojo (no son un
// error, son un estado de espera).
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
    <Card className="relative flex items-center gap-2 p-3">
      {/* after:absolute after:inset-0 ("stretched link"): el <a> solo
          envuelve avatar+texto, pero su pseudo-elemento cubre toda la
          tarjeta (position:relative ya está en el div), así que el área
          tocable es la fila entera. El chevrón va como hermano con z-10
          para quedar por encima de esa capa y seguir siendo clickeable;
          no puede ir dentro del <a> porque no se anida un botón en un
          enlace. */}
      <Link
        href={`/contacts/${role}/${encodeURIComponent(contactKey)}`}
        className="flex min-w-0 flex-1 items-center gap-3 after:absolute after:inset-0"
      >
        <UserAvatar avatarUrl={avatarUrl} name={fullName} size={44} className="bg-primary text-white" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-[15px] font-bold text-foreground">{fullName}</p>
          {(email || rut) && <p className="truncate text-xs text-muted-foreground">{email ?? rut}</p>}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* El chip de rol solo cuando hay búsqueda: ahí la lista
                mezcla las 3 pestañas y sin él no se sabe de cuál viene
                cada fila. Sin búsqueda todas son del rol de la pestaña
                activa — repetirlo en cada tarjeta es ruido. */}
            {showRoleChip && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-muted-foreground">
                {roleBucketLabel(role)}
              </span>
            )}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                isOn ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
              )}
            >
              {chipLabel}
            </span>
          </div>
        </div>
      </Link>
      {/* Sin menú de acciones acá — "Quitar"/"Reenviar" viven en la
          ficha de detalle (la flechita lleva ahí). Que haga falta entrar
          al contacto para encontrar "Quitar" es el punto: un paso más de
          intención antes de una acción destructiva, sin depender de un
          menú que igual había que abrir. */}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Card>
  );
}
