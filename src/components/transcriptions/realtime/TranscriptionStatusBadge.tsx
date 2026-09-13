"use client";

import { useI18n } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";
import { sessionStatusVisuals } from "./realtime-ui";
import type { RealtimeTranscriptionStatus } from "./types";

export interface TranscriptionStatusBadgeProps {
  status: RealtimeTranscriptionStatus;
  className?: string;
  showIcon?: boolean;
}

export function TranscriptionStatusBadge({
  status,
  className,
  showIcon = true,
}: TranscriptionStatusBadgeProps) {
  const { t } = useI18n();
  const { Icon, className: statusClassName, iconClassName } = sessionStatusVisuals[status];
  const label = t(`transcription.status.${status}`);

  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        statusClassName,
        className,
      )}
      role="status"
      aria-label={label}
    >
      {showIcon ? (
        <Icon className={cn("h-3.5 w-3.5 shrink-0", iconClassName)} aria-hidden="true" />
      ) : null}
      <span>{label}</span>
    </span>
  );
}

