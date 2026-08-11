import { ExternalLink } from "lucide-react";
import { detectListingPortal } from "@/lib/listing-portal";
import { cn } from "@/lib/utils";

// El label vive en title/aria-label — no hay hover en móvil, pero el
// atributo sigue siendo la fuente accesible del destino ahí también
// (lector de pantalla, mantener presionado). El color + iniciales ya
// hacen reconocible la marca de un vistazo sin necesitar el label.
export function ListingPortalLink({ url }: { url: string }) {
  const portal = detectListingPortal(url);
  const label = portal.kind === "brand" ? `Ver en ${portal.label}` : "Ver aviso externo";

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
