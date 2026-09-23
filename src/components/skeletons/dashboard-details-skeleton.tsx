import { CarbonCard } from "@/components/ui/carbon-card";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Matches the "Contratos por estado" (carbón) / "Vencen en los próximos
// 60 días" (blanca) section of the dashboard (src/app/page.tsx) — mismos
// fondos que el contenido real, para no destellar al cargar.
export function DashboardDetailsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <CarbonCard className="p-0">
        <div className="border-b border-white/10 px-4 py-3">
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
      </CarbonCard>

      <Card className="p-0">
        <div className="border-b px-4 py-3">
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
      </Card>
    </div>
  );
}
