// Mark: a ledger page (the "libro mayor" the whole product is built on)
// folded into a shield — custody + record-keeping in one glyph. Two brand
// tones only, no gradients.
export function LogoMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16 2 L28 6.5 V15 C28 22.5 23 27.5 16 30 C9 27.5 4 22.5 4 15 V6.5 Z"
        fill="#3c6e5e"
      />
      <path
        d="M16 2 L28 6.5 V15 C28 22.5 23 27.5 16 30 Z"
        fill="#b3542f"
        fillOpacity="0.9"
      />
      <path
        d="M11 12.5H21M11 16H21M11 19.5H17.5"
        stroke="#fbf9f6"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
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
