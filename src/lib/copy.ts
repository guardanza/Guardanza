// Centralized copy for the home page (/) and its marketing sections.
// Scope: home only — persona landings (/corredores, /arrendadores,
// /arrendatarios) keep their own inline copy for now.
//
// Items tagged `proximamente: true` describe things that are not built yet
// (real payment processing, accredited e-signature, automatic tenant
// verification, real interest on custodied funds). We are in Fase A —
// everything is simulated, no real banking or FEA. These are marked as
// upcoming rather than presented as live features, since the public site
// is where real future depositors would read these claims.

export const METADATA_DESCRIPTION =
  "Custodia de garantías de arriendo en Chile: firma digital, historial de movimientos transparente y resolución justa entre arrendador, arrendatario y corredor.";

export const HOME_HERO = {
  eyebrow: "Guardanza",
  title: "La garantía de arriendo, resuelta de principio a fin.",
  description: "Firma digital simple para ambas partes, custodia neutral y un cierre sin sorpresas — todo en un solo lugar.",
  badge: "FIRMA DIGITAL SIN COSTO",
  primaryLabel: "Empieza gratis",
  primaryHref: "/signup",
  secondaryLabel: "Ver cómo funciona",
  secondaryHref: "#como-funciona",
  supportLine: "Pensado para corredores, arrendadores y arrendatarios en Chile.",
};

// "¿Por qué Guardanza?" — only real, already-built differentiators.
// Kept deliberately distinct from HOME_PROTECTIONS below (no repeating
// "historial de movimientos" / "visibilidad total" in both sections).
export const HOME_ATTRIBUTES_TITLE = "¿Por qué Guardanza?";
export const HOME_ATTRIBUTES = [
  {
    key: "neutralidad",
    title: "Neutralidad",
    description: "Un tercero neutral respalda lo acordado entre arrendador y arrendatario — Guardanza no juega para ningún lado.",
  },
  {
    key: "firma-digital",
    title: "Firma digital, sin costo",
    description: "Arrendador y arrendatario firman el contrato digitalmente, cada uno con su propia firma y en su propio momento.",
  },
  {
    key: "resolucion",
    title: "Resoluciones justas",
    description: "Las propuestas se comparan contra valores de referencia del mercado chileno, no contra el criterio de una sola parte.",
  },
];

// Roadmap items — explicitly not live yet. Shown as a secondary,
// clearly-labeled "Próximamente" strip, never mixed into the attributes
// above as if they already existed.
export const HOME_ROADMAP_TITLE = "Lo que viene";
export const HOME_ROADMAP = [
  {
    key: "interes",
    title: "Garantía que rinde",
    description: "La garantía en custodia va a generar interés mientras dure el contrato.",
  },
  {
    key: "pago-flexible",
    title: "Pago flexible",
    description: "Vas a poder pagar la garantía por transferencia, depósito o tarjeta.",
  },
  {
    key: "verificacion",
    title: "Verificación de arrendatarios",
    description: "Los documentos del postulante se van a validar automáticamente para decisiones más rápidas.",
  },
];

export const HOME_STEPS_TITLE = "Cómo funciona Guardanza";
export const HOME_STEPS_SUBTITLE = "4 pasos simples";
export const HOME_STEPS = [
  {
    key: "firma",
    title: "Firma digital",
    description: "Arrendador y arrendatario firman el contrato digitalmente, cada uno desde donde esté, en su propio momento.",
  },
  {
    key: "deposita",
    title: "Deposita",
    description: "Transfieres la garantía y queda registrada en custodia de inmediato.",
  },
  {
    key: "custodia",
    title: "Custodia segura",
    description: "Guardanza custodia la garantía de forma neutral mientras el contrato está vigente, con su estado siempre disponible.",
  },
  {
    key: "resuelve",
    title: "Resuelve sin sorpresas",
    description: "Al terminar, las propuestas se comparan contra valores de referencia del mercado chileno y se aceptan o se ajustan con evidencia.",
  },
];

export const HOME_PROTECTIONS_TITLE = "Cómo protegemos la garantía";
export const HOME_PROTECTIONS = [
  {
    key: "registro",
    title: "Registro completo",
    description: "Cada movimiento queda registrado y no se puede alterar después.",
  },
  {
    key: "visibilidad-total",
    title: "Visibilidad total",
    description: "Arrendador, arrendatario y corredor ven el mismo estado, al mismo tiempo.",
  },
  {
    key: "criterio",
    title: "Criterio documentado",
    description: "Las propuestas se comparan contra valores de referencia documentados del mercado, no contra el criterio de una sola parte.",
  },
  {
    key: "chile",
    title: "Pensado para Chile",
    description: "En español, con RUT, UF y el flujo real del arriendo chileno.",
  },
];

export const HOME_SEGMENTS_TITLE = "Pensado para cada parte";
export const HOME_SEGMENTS = [
  {
    key: "corredores",
    href: "/corredores",
    title: "Para corredores",
    description: "Cierra arriendos más rápido con firma digital simple. Todas tus propiedades y clientes en un solo panel.",
  },
  {
    key: "arrendadores",
    href: "/arrendadores",
    title: "Para arrendadores",
    description: "La garantía queda protegida desde el primer depósito, con descuentos respaldados por valores reales de mercado.",
  },
  {
    key: "arrendatarios",
    href: "/arrendatarios",
    title: "Para arrendatarios",
    description: "Ves dónde está tu dinero en todo momento y recuperas lo que corresponde según el contrato, con criterios claros.",
  },
];

export const HOME_CTA_FINAL = {
  title: "¿Listo para proteger la garantía?",
  description: "Crea tu cuenta gratis y súmate a Guardanza.",
  primaryLabel: "Crear cuenta gratis",
  primaryHref: "/signup",
  secondaryLabel: "Iniciar sesión",
  secondaryHref: "/login",
};

export const FOOTER_TAGLINE = "Custodia neutral de garantías de arriendo en Chile.";
