import { TimelineSkeleton } from "@/components/skeletons/TimelineSkeleton";

export default function Loading() {
  return (
    <div className="p-4">
      <TimelineSkeleton items={6} />
    </div>
  );
}
