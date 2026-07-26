"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRedirect({ to, delayMs = 2000 }: { to: string; delayMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push(to), delayMs);
    return () => clearTimeout(timer);
  }, [to, delayMs, router]);

  return null;
}
