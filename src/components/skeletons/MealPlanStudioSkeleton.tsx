import { SkeletonBase } from "./SkeletonBase";

export function MealPlanStudioSkeleton() {
  return (
    <div className="flex flex-col h-full" aria-hidden="true">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border-neutral bg-warm-surface px-4 py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBase key={i} className="h-8 w-20" />
        ))}
        <div className="flex-1" />
        <SkeletonBase className="h-8 w-28" />
      </div>

      {/* Body: sidebar + editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-border-neutral bg-card-bg p-4 space-y-3 flex-shrink-0">
          <SkeletonBase className="h-4 w-20 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <SkeletonBase className="h-8 w-full" />
            </div>
          ))}
        </div>

        {/* Área principal */}
        <div className="flex-1 p-6 space-y-4">
          <SkeletonBase className="h-6 w-48" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border-neutral bg-card-bg p-4 space-y-2">
                <SkeletonBase className="h-4 w-28" />
                {Array.from({ length: 3 }).map((_, j) => (
                  <SkeletonBase key={j} className="h-3 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
