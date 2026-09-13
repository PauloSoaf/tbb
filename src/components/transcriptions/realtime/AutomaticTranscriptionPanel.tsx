"use client";

import {
  Captions,
  Clock3,
  FileText,
  Link2,
  Mic,
  Pause,
  Play,
  Radio,
  Save,
  Square,
  Trash2,
  VolumeX,
} from "lucide-react";
import { useId } from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";
import { formatDuration } from "./realtime-ui";
import { TranscriptSegmentTimeline } from "./TranscriptSegmentTimeline";
import { TranscriptionConsentNotice } from "./TranscriptionConsentNotice";
import { TranscriptionEndSummary } from "./TranscriptionEndSummary";
import { TranscriptionErrorState } from "./TranscriptionErrorState";
import { TranscriptionParticipantStatus } from "./TranscriptionParticipantStatus";
import { TranscriptionProviderStatus } from "./TranscriptionProviderStatus";
import { TranscriptionStatusBadge } from "./TranscriptionStatusBadge";
import type {
  AudioCaptureStatus,
  RealtimeTranscriptSegment,
  RealtimeTranscriptionStatus,
  TranscriptionParticipant,
  TranscriptionProviderInfo,
  TranscriptionSessionSummary,
  TranscriptionUiError,
} from "./types";

export interface AutomaticTranscriptionPanelProps {
  status: RealtimeTranscriptionStatus;
  captureStatus: AudioCaptureStatus;
  provider: TranscriptionProviderInfo;
  participants: TranscriptionParticipant[];
  segments: RealtimeTranscriptSegment[];
  partialSegment?: RealtimeTranscriptSegment | null;
  durationSeconds?: number;
  error?: TranscriptionUiError | null;
  endSummary?: TranscriptionSessionSummary | null;
  consent?: {
    required: boolean;
    mode: "online" | "in_person";
    acknowledged: boolean;
    onAcknowledgedChange: (acknowledged: boolean) => void;
    onConfirm?: () => void;
    confirming?: boolean;
  };
  pendingAction?:
    | "start"
    | "pause"
    | "resume"
    | "stop"
    | "save"
    | "discard"
    | "attach"
    | "retry";
  disabled?: boolean;
  className?: string;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onSave?: () => void;
  onDiscard?: () => void;
  onAttachToMedicalRecord?: () => void;
  onRetry?: () => void;
  onDismissError?: () => void;
  onCopySegment?: (segment: RealtimeTranscriptSegment) => void | Promise<void>;
  onCopyAllSegments?: (
    segments: RealtimeTranscriptSegment[],
  ) => void | Promise<void>;
  onEditSpeaker?: (segment: RealtimeTranscriptSegment) => void;
}

interface ActionButtonProps {
  label: string;
  Icon: typeof Play;
  onClick: () => void;
  disabled: boolean;
  tone?: "primary" | "secondary" | "danger";
}

function ActionButton({
  label,
  Icon,
  onClick,
  disabled,
  tone = "secondary",
}: ActionButtonProps) {
  const tones = {
    primary:
      "border-primary bg-primary text-primary-foreground hover:bg-primary-hover",
    secondary:
      "border-border-neutral bg-card-bg text-text-primary hover:border-brand-blue/40 hover:text-brand-blue",
    danger:
      "border-danger/25 bg-card-bg text-danger hover:bg-danger/10",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        tones[tone],
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

export function AutomaticTranscriptionPanel({
  status,
  captureStatus,
  provider,
  participants,
  segments,
  partialSegment,
  durationSeconds = 0,
  error,
  endSummary,
  consent,
  pendingAction,
  disabled = false,
  className,
  onStart,
  onPause,
  onResume,
  onStop,
  onSave,
  onDiscard,
  onAttachToMedicalRecord,
  onRetry,
  onDismissError,
  onCopySegment,
  onCopyAllSegments,
  onEditSpeaker,
}: AutomaticTranscriptionPanelProps) {
  const { t } = useI18n();
  const titleId = useId();
  const participantsTitleId = useId();
  const liveCaptionTitleId = useId();
  const isPending = Boolean(pendingAction);
  const retrying = pendingAction === "retry";
  const consentPending = consent?.required && !consent.acknowledged;
  const canStart = ["idle", "stopped", "offline", "error"].includes(status);
  const canPause = status === "active" || status === "reconnecting";
  const canResume = status === "paused";
  const canStop = ["active", "paused", "reconnecting", "connecting"].includes(status);
  const canPersist = status === "stopped";
  const canAttach = status === "saved" || endSummary?.saved;
  const partialText = partialSegment?.text.trim();

  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border-neutral bg-card-bg shadow-sm",
        className,
      )}
      aria-labelledby={titleId}
    >
      <header className="border-b border-border-neutral p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-brand-blue">
              <Captions className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-base font-semibold text-text-primary"
              >
                {t("transcription.automaticTitle")}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {t("transcription.automaticDescription")}
              </p>
            </div>
          </div>
          <TranscriptionStatusBadge status={status} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-warm-surface px-3 py-2">
            <Mic className="h-4 w-4 shrink-0 text-brand-blue" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-[11px] text-text-secondary">
                {t("transcription.capture.title")}
              </p>
              <p className="truncate text-xs font-semibold text-text-primary">
                {t(`transcription.capture.status.${captureStatus}`)}
              </p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-warm-surface px-3 py-2">
            <Clock3 className="h-4 w-4 shrink-0 text-brand-blue" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-[11px] text-text-secondary">
                {t("transcription.duration")}
              </p>
              <p className="font-mono text-xs font-semibold text-text-primary">
                {formatDuration(durationSeconds)}
              </p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-warm-surface px-3 py-2">
            <FileText className="h-4 w-4 shrink-0 text-brand-blue" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-[11px] text-text-secondary">
                {t("transcription.segments")}
              </p>
              <p className="text-xs font-semibold text-text-primary">{segments.length}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-warm-surface px-3 py-2">
            <Radio className="h-4 w-4 shrink-0 text-brand-blue" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-[11px] text-text-secondary">
                {t("transcription.participants.title")}
              </p>
              <p className="text-xs font-semibold text-text-primary">{participants.length}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        {consent?.required ? (
          <TranscriptionConsentNotice
            mode={consent.mode}
            acknowledged={consent.acknowledged}
            onAcknowledgedChange={consent.onAcknowledgedChange}
            onConfirm={consent.onConfirm}
            confirming={consent.confirming}
            disabled={disabled || isPending}
          />
        ) : null}

        {error ? (
          <TranscriptionErrorState
            error={error}
            onRetry={onRetry}
            onDismiss={onDismissError}
            retrying={retrying}
          />
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.7fr)]">
          <TranscriptionProviderStatus
            provider={provider}
            onRetry={onRetry}
            retrying={retrying}
          />

          <section
            className="rounded-lg border border-border-neutral bg-warm-surface p-3"
            aria-labelledby={participantsTitleId}
          >
            <div className="flex items-center justify-between gap-2">
              <h3
                id={participantsTitleId}
                className="text-sm font-semibold text-text-primary"
              >
                {t("transcription.participants.title")}
              </h3>
              <span className="text-xs text-text-secondary">{participants.length}</span>
            </div>
            {participants.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {participants.map((participant) => (
                  <TranscriptionParticipantStatus
                    key={participant.id}
                    participant={participant}
                    compact
                  />
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-text-secondary">
                {t("transcription.participants.empty")}
              </p>
            )}
          </section>
        </div>

        <section
          className="min-h-24 rounded-lg border border-border-neutral bg-background p-4"
          aria-labelledby={liveCaptionTitleId}
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="flex items-center gap-2">
            <Radio
              className={cn(
                "h-4 w-4 text-brand-blue",
                status === "active" && "animate-pulse",
              )}
              aria-hidden="true"
            />
            <h3
              id={liveCaptionTitleId}
              className="text-sm font-semibold text-text-primary"
            >
              {t("transcription.liveCaption")}
            </h3>
          </div>
          {partialText ? (
            <div className="mt-3">
              {partialSegment?.speakerName ? (
                <p className="text-xs font-semibold text-brand-blue">
                  {partialSegment.speakerName}
                </p>
              ) : null}
              <p className="mt-1 break-words text-sm leading-relaxed text-text-primary">
                {partialText}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-secondary">
              {t("transcription.liveCaptionEmpty")}
            </p>
          )}
        </section>

        <TranscriptSegmentTimeline
          segments={segments}
          onCopySegment={onCopySegment}
          onCopyAll={onCopyAllSegments}
          onEditSpeaker={onEditSpeaker}
        />

        <div className="flex items-start gap-2 rounded-lg border border-border-neutral bg-warm-surface px-3 py-2.5 text-xs leading-relaxed text-text-secondary">
          <VolumeX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{t("transcription.audioNotSaved")}</p>
        </div>

        {endSummary ? (
          <TranscriptionEndSummary
            summary={endSummary}
            onSave={onSave}
            onDiscard={onDiscard}
            onAttachToMedicalRecord={onAttachToMedicalRecord}
            pendingAction={
              pendingAction === "save" ||
              pendingAction === "discard" ||
              pendingAction === "attach"
                ? pendingAction
                : undefined
            }
            disabled={disabled}
          />
        ) : null}
      </div>

      <footer className="flex flex-col-reverse gap-2 border-t border-border-neutral bg-warm-surface p-4 sm:flex-row sm:flex-wrap sm:justify-end">
        {canStart && onStart ? (
          <ActionButton
            label={t(
              pendingAction === "start"
                ? "transcription.starting"
                : "transcription.start",
            )}
            Icon={Play}
            onClick={onStart}
            disabled={disabled || isPending || Boolean(consentPending)}
            tone="primary"
          />
        ) : null}
        {canPause && onPause ? (
          <ActionButton
            label={t(
              pendingAction === "pause"
                ? "transcription.pausing"
                : "transcription.pause",
            )}
            Icon={Pause}
            onClick={onPause}
            disabled={disabled || isPending}
          />
        ) : null}
        {canResume && onResume ? (
          <ActionButton
            label={t(
              pendingAction === "resume"
                ? "transcription.resuming"
                : "transcription.resume",
            )}
            Icon={Play}
            onClick={onResume}
            disabled={disabled || isPending}
            tone="primary"
          />
        ) : null}
        {canStop && onStop ? (
          <ActionButton
            label={t(
              pendingAction === "stop"
                ? "transcription.stopping"
                : "transcription.stop",
            )}
            Icon={Square}
            onClick={onStop}
            disabled={disabled || isPending}
            tone="danger"
          />
        ) : null}
        {canPersist && onDiscard && !endSummary ? (
          <ActionButton
            label={t(
              pendingAction === "discard"
                ? "transcription.discarding"
                : "transcription.discard",
            )}
            Icon={Trash2}
            onClick={onDiscard}
            disabled={disabled || isPending}
            tone="danger"
          />
        ) : null}
        {canPersist && onSave && !endSummary ? (
          <ActionButton
            label={t(
              pendingAction === "save"
                ? "transcription.saving"
                : "transcription.save",
            )}
            Icon={Save}
            onClick={onSave}
            disabled={disabled || isPending}
            tone="primary"
          />
        ) : null}
        {canAttach && onAttachToMedicalRecord && !endSummary ? (
          <ActionButton
            label={t("transcription.attachToMedicalRecord")}
            Icon={Link2}
            onClick={onAttachToMedicalRecord}
            disabled={disabled || isPending}
            tone="primary"
          />
        ) : null}
      </footer>
    </section>
  );
}
