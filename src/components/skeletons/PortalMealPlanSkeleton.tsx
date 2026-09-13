import { SkeletonBase } from "./SkeletonBase";

export function PortalMealPlanSkeleton() {
  return (
    <div className="p-4 space-y-4" aria-hidden="true">
      {/* Header */}
      <SkeletonBase className="h-6 w-48" />

      {/* 4 meal cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border-neutral bg-card-bg p-4 space-y-3"
        >
          {/* Meal name + horário */}
          <div className="flex items-center justify-between">
            <SkeletonBase className="h-5 w-28" />
            <SkeletonBase className="h-4 w-14" />
          </div>
          {/* Food items */}
          {Array.from({ length: i % 2 === 0 ? 3 : 4 }).map((_, j) => (
            <div key={j} className="flex items-center gap-3">
              <SkeletonBase className="h-3 w-3 rounded-full" />
              <SkeletonBase className="h-3 flex-1" />
              <SkeletonBase className="h-3 w-12" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
