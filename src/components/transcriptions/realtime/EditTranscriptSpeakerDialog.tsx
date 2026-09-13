"use client";

import { Loader2, Pencil, X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/I18nContext";
import type {
  RealtimeTranscriptSegment,
  TranscriptionSpeakerSource,
} from "./types";

interface Props {
  segment: RealtimeTranscriptSegment | null;
  onClose: () => void;
  onSave: (
    speakerName: string,
    source: TranscriptionSpeakerSource
  ) => void | Promise<void>;
  isSubmitting?: boolean;
}

const SOURCES: TranscriptionSpeakerSource[] = [
  "NUTRITIONIST",
  "PATIENT",
  "TEAM_MEMBER",
  "IN_PERSON_ROOM",
  "UNKNOWN",
];

export function EditTranscriptSpeakerDialog(props: Props) {
  const segment = props.segment;
  if (!segment || typeof document === "undefined") return null;
  return createPortal(
    <EditTranscriptSpeakerDialogContent
      key={segment.id}
      {...props}
      segment={segment}
    />,
    document.body
  );
}

function EditTranscriptSpeakerDialogContent({
  segment,
  onClose,
  onSave,
  isSubmitting = false,
}: Props & { segment: RealtimeTranscriptSegment }) {
  const { t } = useI18n();
  const titleId = useId();
  const [speakerName, setSpeakerName] = useState(segment.speakerName ?? "");
  const [source, setSource] = useState<TranscriptionSpeakerSource>(
    segment.speakerSource ?? "UNKNOWN"
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const name = speakerName.trim();
    if (!name || isSubmitting) return;
    await onSave(name, source);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t("common.close")}
        onClick={onClose}
        disabled={isSubmitting}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-lg border border-border-neutral bg-card-bg shadow-2xl"
      >
        <header className="flex items-center gap-3 border-b border-border-neutral p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subtle text-brand-blue">
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 id={titleId} className="flex-1 text-base font-semibold text-text-primary">
            {t("transcription.editSpeaker.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-warm-surface hover:text-text-primary disabled:opacity-50"
            aria-label={t("common.close")}
            title={t("common.close")}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <form onSubmit={submit}>
          <div className="space-y-4 p-4">
            <label className="block text-sm font-semibold text-text-primary">
              {t("transcription.editSpeaker.name")}
              <input
                autoFocus
                value={speakerName}
                onChange={(event) => setSpeakerName(event.target.value)}
                maxLength={160}
                disabled={isSubmitting}
                className="mt-2 h-10 w-full rounded-lg border border-border-neutral bg-background px-3 text-sm text-text-primary outline-none focus:border-brand-blue focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block text-sm font-semibold text-text-primary">
              {t("transcription.editSpeaker.source")}
              <select
                value={source}
                onChange={(event) =>
                  setSource(event.target.value as TranscriptionSpeakerSource)
                }
                disabled={isSubmitting}
                className="mt-2 h-10 w-full rounded-lg border border-border-neutral bg-background px-3 text-sm text-text-primary outline-none focus:border-brand-blue focus:ring-2 focus:ring-ring"
              >
                {SOURCES.map((item) => (
                  <option key={item} value={item}>
                    {t(`transcription.speaker.${item.toLowerCase()}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <footer className="flex justify-end gap-2 border-t border-border-neutral p-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 rounded-lg border border-border-neutral px-4 text-sm font-semibold text-text-primary hover:border-brand-blue/40 disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!speakerName.trim() || isSubmitting}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("common.save")}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
