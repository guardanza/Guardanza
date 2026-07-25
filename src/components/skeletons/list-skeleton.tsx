import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Generic stand-in for list-shaped pages (properties, organizations,
// documents, signatures, proposals, notifications, history) that don't
// have a distinctive-enough layout to warrant their own bespoke skeleton.
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
