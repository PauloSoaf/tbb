import { SkeletonBase } from "./SkeletonBase";

interface FormSkeletonProps {
  fields?: number;
}

export function FormSkeleton({ fields = 4 }: FormSkeletonProps) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1">
          <SkeletonBase className="h-4 w-24" />
          <SkeletonBase className="h-9 w-full" />
        </div>
      ))}
      {/* Submit button */}
      <SkeletonBase className="h-10 w-32 mt-2" />
    </div>
  );
}
