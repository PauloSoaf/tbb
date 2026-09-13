"use client";

import { Check, ShieldCheck, VolumeX } from "lucide-react";
import { useId } from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";

export interface TranscriptionConsentNoticeProps {
  mode: "online" | "in_person";
  acknowledged: boolean;
  onAcknowledgedChange: (acknowledged: boolean) => void;
  onConfirm?: () => void;
  required?: boolean;
  disabled?: boolean;
  confirming?: boolean;
  className?: string;
}

export function TranscriptionConsentNotice({
  mode,
  acknowledged,
  onAcknowledgedChange,
  onConfirm,
  required = true,
  disabled = false,
  confirming = false,
  className,
}: TranscriptionConsentNoticeProps) {
  const { t } = useI18n();
  const checkboxId = useId();
  const descriptionId = useId();
  const noticeKey =
    mode === "in_person"
      ? "transcription.inPersonConfirmation"
      : "transcription.patientNotice";

  return (
    <section
      className={cn(
        "rounded-lg border border-amber-300/40 bg-attention p-4 text-attention-text",
        className,
      )}
      aria-labelledby={`${checkboxId}-title`}
      aria-describedby={descriptionId}
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 id={`${checkboxId}-title`} className="text-sm font-semibold">
            {t("transcription.consent.title")}
          </h3>
          <p id={descriptionId} className="mt-1 text-sm leading-relaxed">
            {t(noticeKey)}
          </p>

          <div className="mt-3 flex items-start gap-2 rounded-lg border border-current/15 bg-card-bg/70 p-3 text-text-primary">
            <VolumeX className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
            <p className="text-xs leading-relaxed">{t("transcription.audioNotSaved")}</p>
          </div>

          <label
            htmlFor={checkboxId}
            className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm font-medium"
          >
            <input
              id={checkboxId}
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => onAcknowledgedChange(event.target.checked)}
              required={required}
              disabled={disabled || confirming}
              className="mt-0.5 h-4 w-4 rounded border-current bg-card-bg text-brand-blue focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            />
            <span>{t("transcription.consent.acknowledge")}</span>
          </label>

          {onConfirm ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={!acknowledged || disabled || confirming}
              className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              {t(
                confirming
                  ? "transcription.consent.confirming"
                  : "transcription.consent.confirm",
              )}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

