import { ArrowUpRight, ExternalLink } from "lucide-react";
import { detectListingPortal } from "@/lib/listing-portal";
import { cn } from "@/lib/utils";

// El label vive en title/aria-label — no hay hover en móvil, pero el
// atributo sigue siendo la fuente accesible del destino ahí también
// (lector de pantalla, mantener presionado). Para "brand"/"generic" el
// color + iniciales (o el ícono genérico) ya hacen reconocible el
// destino de un vistazo; para "image" (logo real) el propio logo lo
// hace, en un chip blanco en vez del círculo de color — un lockup con
// texto no se ve bien recortado a un círculo.
export function ListingPortalLink({ url }: { url: string }) {
  const portal = detectListingPortal(url);
  const label = portal.kind === "generic" ? "Ver aviso externo" : `Ver en ${portal.label}`;

  if (portal.kind === "image") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={label}
        aria-label={label}
        className="relative flex h-8 shrink-0 items-center rounded-md bg-white px-2 ring-1 ring-border transition-transform hover:scale-105"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- asset propio en public/, sin necesidad de Next/Image para un ícono fijo. */}
        <img src={portal.src} alt={label} className="h-4 w-auto" />
        <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-card ring-1 ring-border">
          <ArrowUpRight className="size-2.5 text-muted-foreground" strokeWidth={2.5} />
        </span>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-transform hover:scale-105",
        portal.badgeClassName
      )}
    >
      {portal.kind === "brand" ? portal.initials : <ExternalLink className="size-4" strokeWidth={2} />}
    </a>
  );
}
