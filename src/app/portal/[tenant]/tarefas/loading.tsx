import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default function Loading() {
  return (
    <div className="p-4">
      <TableSkeleton rows={6} cols={2} />
    </div>
  );
}
