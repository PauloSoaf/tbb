import { SkeletonBase } from "./SkeletonBase";

export function AgendaSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="p-4 lg:p-8 space-y-6">
        {/* KPI bar - 4 cards */}
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card-bg rounded-xl border border-border-neutral p-3 text-center space-y-2">
              <SkeletonBase className="h-8 w-12 mx-auto" />
              <SkeletonBase className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: week list */}
          <div className="lg:col-span-2 space-y-6">
            {/* View toggle + navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <SkeletonBase className="h-9 w-36 rounded-lg" />
              <div className="flex items-center gap-2">
                <SkeletonBase className="h-8 w-24 rounded-lg" />
                <SkeletonBase className="h-8 w-20 rounded-lg" />
                <SkeletonBase className="h-8 w-20 rounded-lg" />
              </div>
            </div>

            {/* Day groups */}
            {Array.from({ length: 2 }).map((_, dayIdx) => (
              <div key={dayIdx} className="space-y-3">
                <SkeletonBase className="h-4 w-32" />
                {Array.from({ length: dayIdx === 0 ? 2 : 1 }).map((_, i) => (
                  <div key={i} className="bg-card-bg rounded-xl border border-border-neutral p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="space-y-1.5">
                          <SkeletonBase className="h-5 w-36" />
                          <SkeletonBase className="h-3.5 w-24" />
                          <SkeletonBase className="h-3 w-20" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <SkeletonBase className="h-7 w-20 rounded-full" />
                        <SkeletonBase className="h-7 w-20 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Right: form */}
          <div className="space-y-4">
            <div className="bg-card-bg rounded-xl border border-border-neutral p-4 space-y-4">
              <SkeletonBase className="h-5 w-32" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <SkeletonBase className="h-3.5 w-20" />
                    <SkeletonBase className="h-9 w-full rounded-lg" />
                  </div>
                ))}
              </div>
              <SkeletonBase className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
