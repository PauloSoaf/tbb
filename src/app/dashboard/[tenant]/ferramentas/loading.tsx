import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";

export default function Loading() {
  return (
    <div className="p-6">
      <CardGridSkeleton cards={6} cols={3} />
    </div>
  );
}
