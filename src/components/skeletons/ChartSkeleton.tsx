import { SkeletonBase } from "./SkeletonBase";

interface ChartSkeletonProps {
  height?: string;
}

export function ChartSkeleton({ height = "h-48" }: ChartSkeletonProps) {
  return (
    <div className={`relative w-full ${height} rounded-lg overflow-hidden`} aria-hidden="true">
      {/* Fundo shimmer */}
      <SkeletonBase className="absolute inset-0 rounded-lg" />
      {/* Eixo Y (linha vertical fina) */}
      <div className="absolute left-8 top-2 bottom-6 w-px bg-border-neutral/40" />
      {/* Eixo X (linha horizontal fina) */}
      <div className="absolute left-8 right-2 bottom-6 h-px bg-border-neutral/40" />
      {/* Barras simuladas */}
      <div className="absolute left-12 right-4 bottom-7 flex items-end gap-2 h-4/5">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBase
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${30 + (i % 3) * 20 + (i % 2) * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}
