"use client";

import { AlertTriangle, RotateCw, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";
import type { TranscriptionUiError } from "./types";

export interface TranscriptionErrorStateProps {
  error: TranscriptionUiError;
  onRetry?: () => void;
  onDismiss?: () => void;
  retrying?: boolean;
  compact?: boolean;
  className?: string;
}

export function TranscriptionErrorState({
  error,
  onRetry,
  onDismiss,
  retrying = false,
  compact = false,
  className,
}: TranscriptionErrorStateProps) {
  const { t } = useI18n();
  const title = t(error.titleKey ?? "transcription.error.title");

  return (
    <section
      className={cn(
        "rounded-lg border border-danger/25 bg-danger/10 text-text-primary",
        compact ? "p-3" : "p-4",
        className,
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">
            {t(error.descriptionKey)}
          </p>
          {error.code ? (
            <p className="mt-2 font-mono text-xs text-text-secondary">
              {t("transcription.error.code")}: {error.code}
            </p>
          ) : null}

          {onRetry && error.recoverable !== false ? (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              aria-busy={retrying || undefined}
              className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCw
                className={cn("h-3.5 w-3.5", retrying && "animate-spin")}
                aria-hidden="true"
              />
              {t(retrying ? "transcription.error.retrying" : "transcription.error.retry")}
            </button>
          ) : null}
        </div>

        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("transcription.error.dismiss")}
            title={t("transcription.error.dismiss")}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </section>
  );
}
