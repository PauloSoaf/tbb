"use client";

import {
  CheckCircle2,
  Clock3,
  FileCheck2,
  Link2,
  Save,
  Trash2,
  UsersRound,
} from "lucide-react";
import { useId } from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";
import { formatDuration } from "./realtime-ui";
import type { TranscriptionSessionSummary } from "./types";

export interface TranscriptionEndSummaryProps {
  summary: TranscriptionSessionSummary;
  onSave?: () => void;
  onDiscard?: () => void;
  onAttachToMedicalRecord?: () => void;
  pendingAction?: "save" | "discard" | "attach";
  disabled?: boolean;
  className?: string;
}

export function TranscriptionEndSummary({
  summary,
  onSave,
  onDiscard,
  onAttachToMedicalRecord,
  pendingAction,
  disabled = false,
  className,
}: TranscriptionEndSummaryProps) {
  const { t } = useI18n();
  const titleId = useId();

  const stats = [
    {
      key: "duration",
      Icon: Clock3,
      label: t("transcription.summary.duration"),
      value: formatDuration(summary.durationSeconds),
    },
    {
      key: "segments",
      Icon: FileCheck2,
      label: t("transcription.summary.segments"),
      value: String(summary.segmentCount),
    },
    {
      key: "participants",
      Icon: UsersRound,
      label: t("transcription.summary.participants"),
      value: String(summary.participantCount),
    },
  ];

  return (
    <section
      className={cn(
        "rounded-lg border border-success/25 bg-success/10 p-4",
        className,
      )}
      aria-labelledby={titleId}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="text-sm font-semibold text-text-primary">
            {t("transcription.summary.title")}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {t("transcription.summary.description")}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 divide-x divide-border-neutral overflow-hidden rounded-lg border border-border-neutral bg-card-bg">
        {stats.map(({ key, Icon, label, value }) => (
          <div key={key} className="min-w-0 px-2 py-3 text-center sm:px-4">
            <Icon className="mx-auto h-4 w-4 text-brand-blue" aria-hidden="true" />
            <dt className="mt-1 truncate text-[11px] text-text-secondary">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-text-primary">{value}</dd>
          </div>
        ))}
      </dl>

      {summary.saved || summary.attachedToMedicalRecord ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {summary.saved ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-card-bg px-2.5 py-1 text-xs font-medium text-success">
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              {t("transcription.summary.saved")}
            </span>
          ) : null}
          {summary.attachedToMedicalRecord ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-card-bg px-2.5 py-1 text-xs font-medium text-success">
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t("transcription.summary.attached")}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        {onDiscard && !summary.saved ? (
          <button
            type="button"
            onClick={onDiscard}
            disabled={disabled || Boolean(pendingAction)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-danger/25 bg-card-bg px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t(
              pendingAction === "discard"
                ? "transcription.discarding"
                : "transcription.discard",
            )}
          </button>
        ) : null}
        {onSave && !summary.saved ? (
          <button
            type="button"
            onClick={onSave}
            disabled={disabled || Boolean(pendingAction)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {t(pendingAction === "save" ? "transcription.saving" : "transcription.save")}
          </button>
        ) : null}
        {onAttachToMedicalRecord && summary.saved && !summary.attachedToMedicalRecord ? (
          <button
            type="button"
            onClick={onAttachToMedicalRecord}
            disabled={disabled || Boolean(pendingAction)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Link2 className="h-4 w-4" aria-hidden="true" />
            {t(
              pendingAction === "attach"
                ? "transcription.attaching"
                : "transcription.attachToMedicalRecord",
            )}
          </button>
        ) : null}
      </div>
    </section>
  );
}
