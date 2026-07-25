"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

// Subtle stagger for list entries (contracts table, dashboard lists) — each
// row fades + slides in 6px, ~40ms after the previous one. StaggerGroup is
// the parent that owns the timing (staggerChildren); StaggerItem is each
// row, which inherits "hidden"/"visible" from the group rather than
// declaring its own initial/animate.
const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
};

const itemVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.01 } },
};

export function StaggerGroup({
  children,
  as = "div",
  className,
}: {
  children: React.ReactNode;
  as?: "div" | "tbody";
  className?: string;
}) {
  const Comp = as === "tbody" ? motion.tbody : motion.div;
  return (
    <Comp initial="hidden" animate="visible" variants={containerVariants} className={className}>
      {children}
    </Comp>
  );
}

export function StaggerItem({
  children,
  as = "div",
  className,
}: {
  children: React.ReactNode;
  as?: "div" | "tr";
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const Comp = as === "tr" ? motion.tr : motion.div;
  return (
    <Comp variants={reduceMotion ? itemVariantsReduced : itemVariants} className={className}>
      {children}
    </Comp>
  );
}
