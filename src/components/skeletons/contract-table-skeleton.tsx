import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Matches the contracts table shape (src/app/contracts/page.tsx): Propiedad,
// Estado, Garantía, Tu rol. Reuses the real Table components so column
// spacing/padding matches the real table exactly, not an approximation.
export function ContractTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      <div className="space-y-3 sm:hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <Card key={i}>
            <div className="space-y-1.5 p-4">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-1/2" />
            </div>
          </Card>
        ))}
      </div>

      <Card className="hidden p-0 sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Propiedad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Garantía</TableHead>
              <TableHead>Tu rol</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-28" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
