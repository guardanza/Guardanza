// Escudo bicolor con muesca en V — SVG inline, no un PNG (public/logo-*.png
// quedó retirado): se ve nítido a cualquier tamaño y se recolorea sin
// generar un archivo aparte. viewBox 64×68 tal cual el original.
//
// `invert` es para fondos oscuros/verdes — hoy ningún lugar de la app lo
// necesita (todos los usos de <Logo>/<LogoMark> son sobre fondo claro),
// pero queda listo para cuando haga falta, sin tener que rehacer esto.
// El correo (contact-invite.ts) NO usa este componente — un email no
// puede ejecutar React — así que la versión invertida vive aparte, como
// PNG rasterizado del mismo SVG (ver logo-shield-white.png).
const SHIELD_ASPECT = 68 / 64;

export function LogoMark({ className, size = 28, invert = false }: { className?: string; size?: number; invert?: boolean }) {
  const height = Math.round(size * SHIELD_ASPECT);
  const [dark, medium] = invert ? ["#ffffff", "#cfe6da"] : ["#14432f", "#1f7a4d"];
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
      <path d="M10 10h14l8 8 8-8h14v22c0 14-10 23-22 30C20 55 10 46 10 32V10z" fill={dark} />
      <path d="M32 18l8-8h14v22c0 14-10 23-22 30V18z" fill={medium} />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark />
      <span className="text-sm font-semibold tracking-widest text-brand-forest uppercase">Guardanza</span>
    </span>
  );
}
