import { SkeletonBase } from "./SkeletonBase";

export function CareSessionsSkeleton() {
  return (
    <div className="p-6 space-y-4" aria-hidden="true">
      {/* Header with button */}
      <div className="flex items-center justify-between">
        <SkeletonBase className="h-6 w-40" />
        <SkeletonBase className="h-9 w-40" />
      </div>

      {/* Lista de cards */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border border-border-neutral bg-card-bg p-4"
        >
          <SkeletonBase className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBase className="h-4 w-36" />
            <SkeletonBase className="h-3 w-24" />
          </div>
          <SkeletonBase className="h-6 w-20" />
          <SkeletonBase className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}
