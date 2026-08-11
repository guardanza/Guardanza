// Detecta a qué portal inmobiliario apunta expected_listing_url para
// mostrar un ícono reconocible en vez del link de texto plano. Son
// aproximaciones propias (color + iniciales), no los logos oficiales de
// cada marca — no están disponibles para este proyecto, y tampoco
// correspondería incluirlos sin licencia. El dominio no reconocido cae
// al ícono genérico de "enlace externo", nunca en un ícono roto o vacío.
export type ListingPortal =
  | { kind: "brand"; label: string; initials: string; badgeClassName: string }
  | { kind: "generic"; badgeClassName: string };

const BRAND_PORTALS: { hosts: string[]; portal: ListingPortal }[] = [
  { hosts: ["portalinmobiliario.com"], portal: { kind: "brand", label: "PortalInmobiliario", initials: "PI", badgeClassName: "bg-teal-600 text-white" } },
  { hosts: ["yapo.cl"], portal: { kind: "brand", label: "Yapo", initials: "YP", badgeClassName: "bg-orange-500 text-white" } },
  { hosts: ["toctoc.com"], portal: { kind: "brand", label: "TocToc", initials: "TT", badgeClassName: "bg-indigo-600 text-white" } },
  { hosts: ["goplaceit.com"], portal: { kind: "brand", label: "GoPlaceIt", initials: "GP", badgeClassName: "bg-emerald-600 text-white" } },
  {
    hosts: ["mercadolibre.cl", "mercadolibre.com", "mercadolibre.com.cl"],
    portal: { kind: "brand", label: "MercadoLibre", initials: "ML", badgeClassName: "bg-yellow-400 text-yellow-950" },
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
