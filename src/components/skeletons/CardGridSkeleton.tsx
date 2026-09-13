import { SkeletonBase } from "./SkeletonBase";

interface CardGridSkeletonProps {
  cards?: number;
  cols?: 2 | 3 | 4;
}

const colsMap: Record<2 | 3 | 4, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export function CardGridSkeleton({ cards = 4, cols = 4 }: CardGridSkeletonProps) {
  return (
    <div className={`grid gap-4 ${colsMap[cols]}`} aria-hidden="true">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border-neutral bg-card-bg p-4 space-y-3">
          <SkeletonBase className="h-4 w-32" />
          <SkeletonBase className="h-8 w-16" />
          <SkeletonBase className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
