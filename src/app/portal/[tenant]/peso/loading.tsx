import { ChartSkeleton } from "@/components/skeletons/ChartSkeleton";
import { FormSkeleton } from "@/components/skeletons/FormSkeleton";

export default function Loading() {
  return (
    <div className="p-4 space-y-4">
      <FormSkeleton fields={2} />
      <ChartSkeleton height="h-40" />
    </div>
  );
}
