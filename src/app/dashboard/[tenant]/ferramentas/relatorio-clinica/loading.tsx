import { ChartSkeleton } from "@/components/skeletons/ChartSkeleton";

export default function Loading() {
  return (
    <div className="p-6 space-y-4">
      <ChartSkeleton height="h-64" />
      <ChartSkeleton height="h-48" />
    </div>
  );
}
