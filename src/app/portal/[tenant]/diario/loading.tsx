import { FormSkeleton } from "@/components/skeletons/FormSkeleton";

export default function Loading() {
  return (
    <div className="p-4">
      <FormSkeleton fields={5} />
    </div>
  );
}
