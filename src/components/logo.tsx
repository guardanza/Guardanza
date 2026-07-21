// Mark: a shield whose silhouette reads as a little house — the window
// inside does that work, not an added roofline. Monochrome (green family
// only): dark outline, lighter window, no second brand color mixed in.
const SHIELD_PATH =
  "M16 3C12.2 3 8.3 4.1 6 5.4V15c0 7 4 11.9 10 15 6-3.1 10-8 10-15V5.4C23.7 4.1 19.8 3 16 3Z";

export function LogoMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d={SHIELD_PATH} fill="#dcebe4" stroke="#2f5142" strokeWidth="1.6" />
      <rect x="12" y="11" width="8" height="8" rx="1" fill="none" stroke="#5c8a76" strokeWidth="1.5" />
      <path d="M16 11V19M12 15H20" stroke="#5c8a76" strokeWidth="1.5" strokeLinecap="round" />
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
