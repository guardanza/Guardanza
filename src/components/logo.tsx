import Image from "next/image";

// Mark: the user-supplied shield artwork (public/logo-shield.png), not a
// hand-drawn SVG — background removed via chroma-key so it drops cleanly
// onto any surface. Source is 311x389; height is derived from `size` to
// preserve that aspect ratio at any display width.
const SHIELD_ASPECT = 389 / 311;

export function LogoMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/logo-shield.png"
      alt=""
      width={size}
      height={Math.round(size * SHIELD_ASPECT)}
      className={className}
      priority
    />
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark />
      <span className="text-sm font-semibold tracking-widest text-foreground uppercase">Guardanza</span>
    </span>
  );
}
