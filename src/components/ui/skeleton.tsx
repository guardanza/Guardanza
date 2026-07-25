import { cn } from "@/lib/utils";

// Uses the existing .animate-shimmer utility (globals.css) — a gradient
// sweep, not an opacity pulse, and pure CSS so it's free to run alongside
// framer-motion's page transitions without adding to the JS bundle.
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-shimmer rounded-md", className)} />;
}
