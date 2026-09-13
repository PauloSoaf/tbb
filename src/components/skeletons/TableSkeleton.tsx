import { SkeletonBase } from "./SkeletonBase";

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({ rows = 6, cols = 5 }: TableSkeletonProps) {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-border-neutral" aria-hidden="true">
      {/* Header */}
      <div className="flex gap-3 border-b border-border-neutral bg-warm-surface px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBase
            key={i}
            className={`h-4 ${i === cols - 1 ? "w-16" : "flex-1"}`}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex gap-3 border-b border-border-neutral bg-card-bg px-4 py-3 last:border-b-0"
        >
          {Array.from({ length: cols }).map((_, col) => (
            <SkeletonBase
              key={col}
              className={`h-4 ${col === cols - 1 ? "w-16" : "flex-1"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
