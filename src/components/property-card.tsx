import Link from "next/link";
import { PropertyThumb } from "@/components/property-thumb";
import { GreenCard } from "@/components/ui/green-card";
import { cn } from "@/lib/utils";

// Tarjeta de propiedad — mismo sistema verde que Contactos/Candidatos
// (ver ui/green-card.tsx), con la foto arriba a todo el ancho en vez del
// layout anterior (miniatura a la izquierda) — así lo pidió el usuario,
// mismo criterio que el mockup de referencia (verde-75-sistema.html).
//
// El menú de tres puntitos (PropertyRowMenu) es un hermano del <Link>,
// no algo anidado adentro — mismo motivo que el chevrón de ContactCard:
// un botón no se anida dentro de un enlace. El <Link> cubre toda la
// tarjeta con position:absolute + inset-0 (en vez del truco
// after:absolute que usa ContactCard) porque acá el área clickeable
// tiene que incluir la foto, no solo el bloque de texto — el contenido
// visual va con pointer-events-none para que el click pase directo al
// enlace debajo, salvo en la esquina del menú (z-10, sí recibe eventos).
export function PropertyCard({
  href,
  photoUrl,
  address,
  location,
  badges,
  menu,
}: {
  href: string;
  photoUrl: string | null;
  address: string;
  location: string;
  badges: React.ReactNode;
  menu?: React.ReactNode;
}) {
  return (
    <GreenCard className="relative overflow-hidden p-0 transition-shadow hover:shadow-[0_4px_16px_rgba(20,67,47,0.26)]">
      <Link href={href} className="absolute inset-0" aria-label={address} />
      <div className="pointer-events-none">
        <PropertyThumb url={photoUrl} className="h-28 w-full border-b border-white/15 bg-brand-green-card-deep text-white/60" />
        <div className="space-y-1.5 p-3">
          <div className="min-w-0">
            <p className={cn("truncate text-[15px] font-bold text-white", "[text-shadow:0_1px_2px_rgba(0,0,0,0.18)]")}>{address}</p>
            <p className="truncate text-xs text-white">{location}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">{badges}</div>
        </div>
      </div>
      {menu && <div className="absolute top-2 right-2 z-10">{menu}</div>}
    </GreenCard>
  );
}
