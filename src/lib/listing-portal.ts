// Detecta a qué portal inmobiliario apunta expected_listing_url para
// mostrar un ícono reconocible en vez del link de texto plano.
//
// MercadoLibre y PortalInmobiliario son del mismo grupo — comparten el
// logo real (public/logos/mercadolibre.png, provisto para este
// proyecto). El resto son aproximaciones propias (color + iniciales),
// no logos oficiales — no están disponibles para este proyecto. El
// dominio no reconocido cae al ícono genérico de "enlace externo",
// nunca en un ícono roto o vacío.
export type ListingPortal =
  | { kind: "brand"; label: string; initials: string; badgeClassName: string }
  | { kind: "image"; label: string; src: string }
  | { kind: "generic"; badgeClassName: string };

const MERCADOLIBRE_LOGO = "/logos/mercadolibre.png";

const BRAND_PORTALS: { hosts: string[]; portal: ListingPortal }[] = [
  { hosts: ["portalinmobiliario.com"], portal: { kind: "image", label: "PortalInmobiliario", src: MERCADOLIBRE_LOGO } },
  { hosts: ["yapo.cl"], portal: { kind: "brand", label: "Yapo", initials: "YP", badgeClassName: "bg-orange-500 text-white" } },
  { hosts: ["toctoc.com"], portal: { kind: "brand", label: "TocToc", initials: "TT", badgeClassName: "bg-indigo-600 text-white" } },
  { hosts: ["goplaceit.com"], portal: { kind: "brand", label: "GoPlaceIt", initials: "GP", badgeClassName: "bg-emerald-600 text-white" } },
  {
    hosts: ["mercadolibre.cl", "mercadolibre.com", "mercadolibre.com.cl"],
    portal: { kind: "image", label: "MercadoLibre", src: MERCADOLIBRE_LOGO },
  },
];

const GENERIC_PORTAL: ListingPortal = { kind: "generic", badgeClassName: "bg-muted text-muted-foreground" };

export function detectListingPortal(url: string): ListingPortal {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    const match = BRAND_PORTALS.find(({ hosts }) => hosts.some((h) => host === h || host.endsWith(`.${h}`)));
    return match?.portal ?? GENERIC_PORTAL;
  } catch {
    return GENERIC_PORTAL;
  }
}
