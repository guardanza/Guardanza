"use client";

import { motion, useReducedMotion } from "framer-motion";

// Next.js remounts template.tsx on every navigation (unlike layout.tsx,
// which persists) — that's what gives each page a fresh mount to animate
// in from. The exit animation (previous page fading out) is handled by
// AnimatePresence in PageTransitionProvider, up in the root layout.
export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: reduceMotion ? 0.01 : 0.22, ease: [0.16, 1, 0.3, 1] } }}
      exit={{ opacity: 0, transition: { duration: reduceMotion ? 0.01 : 0.15 } }}
    >
      {children}
    </motion.div>
  );
}
