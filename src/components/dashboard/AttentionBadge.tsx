interface AttentionBadgeProps {
  text: string;
}

export function AttentionBadge({ text }: AttentionBadgeProps) {
  return (
    <span className="inline-flex items-center px-3 py-1.5 bg-attention text-attention-text text-xs font-medium rounded-full">
      ⚠ {text}
    </span>
  );
}
