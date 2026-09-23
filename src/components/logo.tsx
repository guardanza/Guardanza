// Escudo bicolor con muesca en V — SVG inline, no un PNG: se ve nítido a
// cualquier tamaño y se recolorea sin generar un archivo aparte. viewBox
// 64×68 tal cual el original. Ahora dorado bicolor (antes verde), un solo
// par de colores fijo (#a8822f/#e0b85c) — a propósito, no cambia entre
// fondo claro y carbón: los dos tonos de dorado tienen contraste de
// sobra contra blanco/crema Y contra carbón (verificado, ver /estilos),
// así que no hace falta una variante "invertida" del ícono como existía
// para el escudo verde anterior.
//
// El wordmark de TEXTO sí necesita cambiar: blanco sobre carbón, casi
// negro sobre fondo claro — por eso `invert` sigue existiendo, pero solo
// afecta el texto ahora, no el escudo.
//
// El correo (contact-invite.ts) NO usa este componente — un email no
// puede ejecutar React — así que el logo para el encabezado del correo
// vive aparte, como PNG rasterizado del mismo SVG (ver
// logo-shield-gold.png).
const SHIELD_ASPECT = 68 / 64;

export function LogoMark({ className, size = 28 }: { className?: string; size?: number }) {
  const height = Math.round(size * SHIELD_ASPECT);
  return (
    <svg
      viewBox="0 0 64 68"
      width={size}
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 10h14l8 8 8-8h14v22c0 14-10 23-22 30C20 55 10 46 10 32V10z" fill="#a8822f" />
      <path d="M32 18l8-8h14v22c0 14-10 23-22 30V18z" fill="#e0b85c" />
    </svg>
  );
}

export function Logo({ className, invert = false }: { className?: string; invert?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark />
      <span className={`text-sm font-semibold tracking-widest uppercase ${invert ? "text-white" : "text-foreground"}`}>Guardanza</span>
    </span>
  );
}
