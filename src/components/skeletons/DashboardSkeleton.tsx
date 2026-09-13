import { CardGridSkeleton } from "./CardGridSkeleton";
import { TableSkeleton } from "./TableSkeleton";
import { SkeletonBase } from "./SkeletonBase";

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6" aria-hidden="true">
      {/* Row 1: 4 stat cards */}
      <CardGridSkeleton cards={4} cols={4} />

      {/* Row 2: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna larga — tabela */}
        <div className="lg:col-span-2">
          <TableSkeleton rows={4} cols={4} />
        </div>
        {/* Coluna estreita — 3 items */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border-neutral bg-card-bg p-4 space-y-2">
              <SkeletonBase className="h-4 w-24" />
              <SkeletonBase className="h-3 w-32" />
              <SkeletonBase className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: lista pequena */}
      <div className="rounded-lg border border-border-neutral bg-card-bg p-4 space-y-3">
        <SkeletonBase className="h-4 w-40 mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonBase className="h-8 w-8 rounded-full" />
            <SkeletonBase className="h-4 flex-1" />
            <SkeletonBase className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
