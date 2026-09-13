"use client";

import { Mic, MicOff, UserRound } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";
import { normalizeAudioLevel, participantStatusVisuals } from "./realtime-ui";
import type { TranscriptionParticipant } from "./types";

export interface TranscriptionParticipantStatusProps {
  participant: TranscriptionParticipant;
  compact?: boolean;
  className?: string;
}

const AUDIO_BARS = [0.2, 0.4, 0.6, 0.8] as const;

export function TranscriptionParticipantStatus({
  participant,
  compact = false,
  className,
}: TranscriptionParticipantStatusProps) {
  const { t } = useI18n();
  const visual = participantStatusVisuals[participant.status];
  const StatusIcon = visual.Icon;
  const sourceLabel = t(`transcription.speaker.${participant.source.toLowerCase()}`);
  const statusLabel = t(`transcription.participantStatus.${participant.status}`);
  const level = normalizeAudioLevel(participant.audioLevel);
  const isListening = participant.status === "transcribing";
  const MicrophoneIcon = isListening ? Mic : MicOff;

  return (
    <article
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-lg border border-border-neutral bg-card-bg",
        compact ? "px-2.5 py-2" : "p-3",
        className,
      )}
      aria-label={`${participant.name}: ${statusLabel}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-brand-blue">
        <UserRound className="h-4 w-4" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-text-primary">{participant.name}</p>
          {participant.isLocal ? (
            <span className="shrink-0 text-[11px] text-text-secondary">
              {t("transcription.participants.you")}
            </span>
          ) : null}
        </div>
        {!compact ? (
          <p className="truncate text-xs text-text-secondary">{sourceLabel}</p>
        ) : null}
      </div>

      {isListening ? (
        <div
          className="flex h-5 shrink-0 items-end gap-0.5"
          aria-label={t("transcription.participants.audioLevel")}
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(level * 100)}
        >
          {AUDIO_BARS.map((threshold, index) => (
            <span
              key={threshold}
              className={cn(
                "w-1 rounded-full transition-colors",
                level >= threshold ? "bg-success" : "bg-border-neutral",
              )}
              style={{ height: `${8 + index * 3}px` }}
              aria-hidden="true"
            />
          ))}
        </div>
      ) : null}

      <span
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
          visual.className,
        )}
        title={statusLabel}
      >
        <StatusIcon
          className={cn("h-3.5 w-3.5", visual.iconClassName)}
          aria-hidden="true"
        />
        <span className="sr-only">{statusLabel}</span>
      </span>

      <MicrophoneIcon className="sr-only" aria-hidden="true" />
    </article>
  );
}

