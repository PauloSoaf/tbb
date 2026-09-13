"use client";

import { TranscriptionStatus } from "@prisma/client";
import { useI18n } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";

const statusColors: Record<TranscriptionStatus, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  UPLOADED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PROCESSING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  NEEDS_REVIEW: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  REVIEWED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

interface Props {
  status: TranscriptionStatus;
  className?: string;
}

export function TranscriptionStatusBadge({ status, className }: Props) {
  const { t } = useI18n();
  const key = status.toLowerCase() as string;
  const label = t(`transcriptions.status.${key}`) || status;

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", statusColors[status], className)}>
      {label}
    </span>
  );
}
