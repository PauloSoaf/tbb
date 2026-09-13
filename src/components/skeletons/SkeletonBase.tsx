import type { CSSProperties } from "react";

export function SkeletonBase({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`animate-pulse motion-reduce:animate-none rounded bg-border-neutral/50 dark:bg-border-neutral/30 ${className ?? ""}`}
      style={style}
      aria-hidden="true"
    />
  );
}
