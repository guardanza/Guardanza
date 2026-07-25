import Image from "next/image";
import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Elegant fallback, not a generic gray icon: initials on ForestGuard when
// there's no photo. Images are lazy-loaded and never block render — the
// initials show immediately regardless, so there's nothing to wait on.
export function UserAvatar({
  avatarUrl,
  name,
  size = 32,
  className,
}: {
  avatarUrl?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground", className)}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {getInitials(name)}
    </span>
  );
}
