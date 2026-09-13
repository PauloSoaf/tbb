import { SkeletonBase } from "./SkeletonBase";

interface TimelineSkeletonProps {
  items?: number;
}

export function TimelineSkeleton({ items = 5 }: TimelineSkeletonProps) {
  return (
    <div className="relative space-y-4" aria-hidden="true">
      {/* Linha vertical */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border-neutral/50" />

      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 pl-0">
          {/* Círculo shimmer */}
          <SkeletonBase className="h-8 w-8 rounded-full flex-shrink-0 z-10" />
          {/* Card shimmer */}
          <div className="flex-1 rounded-lg border border-border-neutral bg-card-bg p-3 space-y-2">
            <SkeletonBase className="h-4 w-32" />
            <SkeletonBase className="h-3 w-full" />
            <SkeletonBase className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
