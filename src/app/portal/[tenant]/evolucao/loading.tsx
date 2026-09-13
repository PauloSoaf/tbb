import { ChartSkeleton } from "@/components/skeletons/ChartSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default function Loading() {
  return (
    <div className="p-4 space-y-4">
      <ChartSkeleton height="h-48" />
      <TableSkeleton rows={5} cols={4} />
    </div>
  );
}
