import { SkeletonBase } from "./SkeletonBase";
import { CardGridSkeleton } from "./CardGridSkeleton";

export function PatientRecordSkeleton() {
  return (
    <div className="p-6 space-y-6" aria-hidden="true">
      {/* Header: avatar + name + badge */}
      <div className="flex items-center gap-4">
        <SkeletonBase className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <SkeletonBase className="h-5 w-40" />
          <SkeletonBase className="h-4 w-16" />
        </div>
      </div>

      {/* Tabs: 6 buttons */}
      <div className="flex gap-2 border-b border-border-neutral pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBase key={i} className="h-8 w-24" />
        ))}
      </div>

      {/* Body: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: 3 card variants */}
        <div className="lg:col-span-2 space-y-6">
          <CardGridSkeleton cards={2} cols={2} />
          <CardGridSkeleton cards={2} cols={2} />
        </div>
        {/* Sidebar */}
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border-neutral bg-card-bg p-4 space-y-2">
              <SkeletonBase className="h-4 w-20" />
              <SkeletonBase className="h-3 w-28" />
              <SkeletonBase className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
