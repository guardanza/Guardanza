import { CarbonCard } from "@/components/ui/carbon-card";
import { Skeleton } from "@/components/ui/skeleton";

// Matches the 3-stat-card row at the top of the dashboard (src/app/page.tsx)
// — CarbonCard, no un Card blanco, para que el marco ya sea carbón antes de
// que lleguen los datos reales (sin destello blanco→carbón).
export function DashboardCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <CarbonCard key={i} className="space-y-2 p-4">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-6 w-20" />
        </CarbonCard>
      ))}
    </div>
  );
}
