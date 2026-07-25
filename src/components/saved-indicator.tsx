"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Check } from "lucide-react";

// Shows a "Guardado" checkmark for ~2s after a redirect back with
// ?saved=1, then fades out and strips the param so refreshing/going back
// doesn't re-show it.
export function SavedIndicator({ param = "saved" }: { param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(searchParams.get(param) === "1");

  useEffect(() => {
    if (searchParams.get(param) !== "1") return;
    const hideTimer = setTimeout(() => setVisible(false), 2000);
    const cleanupTimer = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.delete(param);
      router.replace(next.size > 0 ? `${pathname}?${next.toString()}` : pathname, { scroll: false });
    }, 2300);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(cleanupTimer);
    };
  }, [searchParams, param, router, pathname]);

  if (!searchParams.get(param)) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-medium text-success transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <Check className="size-4" strokeWidth={2.5} />
      Guardado
    </span>
  );
}
