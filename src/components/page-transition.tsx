"use client";

import { AnimatePresence } from "framer-motion";

// Lives in the persistent root layout (not in template.tsx itself, which
// gets unmounted/remounted on every navigation) so it survives across
// navigations and can actually see the outgoing page get swapped for the
// incoming one. Its direct child is `{children}` from layout.tsx, which
// Next.js resolves to `<Template key={route}>{page}</Template>` — the
// auto-assigned key on that Template element is what AnimatePresence keys
// its enter/exit tracking off, so template.tsx (page-transition-frame.tsx)
// doesn't need to (and can't reliably) do that keying itself.
export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  return <AnimatePresence mode="wait">{children}</AnimatePresence>;
}
