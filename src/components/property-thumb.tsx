import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function PropertyThumb({ url, className }: { url: string | null | undefined; className?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URLs, not worth Next/Image's remote-pattern config for Fase A demo data.
    return <img src={url} alt="" className={cn("object-cover", className)} />;
  }
  return (
    <div className={cn("flex items-center justify-center bg-secondary text-muted-foreground", className)}>
      <Home className="size-1/2" strokeWidth={1.5} />
    </div>
  );
}
