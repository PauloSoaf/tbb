import { SkeletonBase } from "./SkeletonBase";

export function PortalDashboardSkeleton() {
  return (
    <div className="p-4 space-y-4" aria-hidden="true">
      {/* Greeting */}
      <div className="space-y-2">
        <SkeletonBase className="h-6 w-40" />
        <SkeletonBase className="h-4 w-56" />
      </div>

      {/* Week streak banner */}
      <div className="flex gap-4 rounded-lg border border-border-neutral bg-card-bg p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1 space-y-2">
            <SkeletonBase className="h-6 w-8" />
            <SkeletonBase className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Next appt card */}
      <SkeletonBase className="h-24 w-full rounded-lg" />

      {/* Weight mini-chart */}
      <SkeletonBase className="h-16 w-full rounded-lg" />

      {/* Meal plan card */}
      <SkeletonBase className="h-20 w-full rounded-lg" />

      {/* Quick actions grid 2x3 */}
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBase key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
