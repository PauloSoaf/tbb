import { SkeletonBase } from "./SkeletonBase";
import { TableSkeleton } from "./TableSkeleton";

export function PatientListSkeleton() {
  return (
    <div className="p-6 space-y-4" aria-hidden="true">
      {/* Header: search + button */}
      <div className="flex items-center gap-3">
        <SkeletonBase className="h-9 flex-1 max-w-xs" />
        <SkeletonBase className="h-9 w-32" />
      </div>

      {/* Table */}
      <TableSkeleton rows={8} cols={5} />

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <SkeletonBase className="h-4 w-32" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBase key={i} className="h-8 w-8" />
          ))}
        </div>
      </div>
    </div>
  );
}
