"use client";

import { Activity, Clock3, Cpu, Languages } from "lucide-react";
import { useId } from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";
import { providerStatusVisuals } from "./realtime-ui";
import type { TranscriptionProviderInfo } from "./types";

export interface TranscriptionProviderStatusProps {
  provider: TranscriptionProviderInfo;
  compact?: boolean;
  className?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export function TranscriptionProviderStatus({
  provider,
  compact = false,
  className,
  onRetry,
  retrying = false,
}: TranscriptionProviderStatusProps) {
  const { t } = useI18n();
  const titleId = useId();
  const visual = providerStatusVisuals[provider.health];
  const StatusIcon = visual.Icon;
  const statusLabel = t(`transcription.providerStatus.${provider.health}`);

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5",
          visual.className,
          className,
        )}
        role="status"
        aria-label={`${provider.name}: ${statusLabel}`}
      >
        <StatusIcon
          className={cn("h-3.5 w-3.5 shrink-0", visual.iconClassName)}
          aria-hidden="true"
        />
        <span className="truncate text-xs font-semibold">{provider.name}</span>
        <span className="sr-only">{statusLabel}</span>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "rounded-lg border border-border-neutral bg-warm-surface p-3",
        className,
      )}
      aria-labelledby={titleId}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 shrink-0 text-brand-blue" aria-hidden="true" />
            <h3
              id={titleId}
              className="text-sm font-semibold text-text-primary"
            >
              {t("transcription.provider")}
            </h3>
          </div>
          <p className="mt-1 truncate text-sm font-medium text-text-primary">{provider.name}</p>
        </div>

        <span
          className={cn(
            "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
            visual.className,
          )}
          role="status"
        >
          <StatusIcon
            className={cn("h-3.5 w-3.5", visual.iconClassName)}
            aria-hidden="true"
          />
          {statusLabel}
        </span>
      </div>

      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        {provider.model ? (
          <div className="flex min-w-0 items-center gap-2 text-text-secondary">
            <Cpu className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <dt className="sr-only">{t("transcription.model")}</dt>
            <dd className="truncate" title={provider.model}>
              {provider.model}
            </dd>
          </div>
        ) : null}
        {provider.language ? (
          <div className="flex items-center gap-2 text-text-secondary">
            <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <dt className="sr-only">{t("transcription.language")}</dt>
            <dd>{provider.language}</dd>
          </div>
        ) : null}
        {provider.latencyMs !== undefined ? (
          <div className="flex items-center gap-2 text-text-secondary">
            <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <dt>{t("transcription.latency")}</dt>
            <dd>
              {provider.latencyMs} {t("transcription.units.milliseconds")}
            </dd>
          </div>
        ) : null}
      </dl>

      {onRetry && (provider.health === "offline" || provider.health === "degraded") ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          aria-busy={retrying || undefined}
          className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border-neutral bg-card-bg px-3 text-xs font-semibold text-text-primary transition-colors hover:border-brand-blue/40 hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          <StatusIcon
            className={cn("h-3.5 w-3.5", retrying && "animate-spin")}
            aria-hidden="true"
          />
          {t(retrying ? "transcription.providerTesting" : "transcription.retry")}
        </button>
      ) : null}
    </section>
  );
}
