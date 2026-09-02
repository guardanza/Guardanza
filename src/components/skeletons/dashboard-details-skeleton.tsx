import { GreenCard } from "@/components/ui/green-card";
import { Skeleton } from "@/components/ui/skeleton";

// Matches the "Contratos por estado" / "Vencen en los próximos 60 días"
// section of the dashboard (src/app/page.tsx) — mismo GreenCard que el
// contenido real, para no destellar blanco→verde al cargar.
export function DashboardDetailsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <GreenCard className="p-0">
        <div className="border-b border-white/12 px-4 py-3">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-2.5 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-32 shrink-0" />
              <Skeleton className="h-1.5 flex-1 rounded-full" />
              <Skeleton className="h-3 w-5 shrink-0" />
            </div>
          ))}
        </div>
      </GreenCard>

      <GreenCard className="p-0">
        <div className="border-b border-white/12 px-4 py-3">
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </GreenCard>
    </div>
  );
}
