import { SkeletonBase } from "./SkeletonBase";

export function PatientBodySkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20" aria-hidden="true">
      {/* Main timeline column */}
      <div className="lg:col-span-8 space-y-6">
        {/* Quick note input skeleton */}
        <div className="bg-card-bg rounded-3xl p-4 shadow-sm border border-border-neutral">
          <SkeletonBase className="h-10 w-full rounded-xl" />
        </div>

        {/* Timeline card */}
        <div className="bg-card-bg rounded-3xl p-6 shadow-sm border border-border-neutral space-y-4">
          <SkeletonBase className="h-6 w-48 mb-2" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-start">
              <SkeletonBase className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonBase className="h-4 w-32" />
                <SkeletonBase className="h-3 w-full max-w-sm" />
                <SkeletonBase className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar info column */}
      <div className="lg:col-span-4 space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card-bg rounded-3xl p-5 shadow-sm border border-border-neutral space-y-3">
            <SkeletonBase className="h-4 w-32" />
            <SkeletonBase className="h-3 w-full" />
            <SkeletonBase className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
