"use client";

import { Captions, PanelRightOpen } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";
import type { RealtimeTranscriptSegment } from "./types";

export interface LiveCaptionOverlayProps {
  segment?: RealtimeTranscriptSegment | null;
  visible?: boolean;
  onOpenPanel?: () => void;
  compact?: boolean;
  className?: string;
}

export function LiveCaptionOverlay({
  segment,
  visible = true,
  onOpenPanel,
  compact = false,
  className,
}: LiveCaptionOverlayProps) {
  const { t } = useI18n();
  const text = segment?.text.trim();

  if (!visible || !text) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-2 bottom-3 z-30 flex justify-center sm:inset-x-4 sm:bottom-5",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto w-full border border-white/15 bg-black/80 text-white shadow-xl backdrop-blur-md",
          compact
            ? "max-w-xl rounded-lg px-3 py-2"
            : "max-w-3xl rounded-lg px-4 py-3 sm:px-5",
        )}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-start gap-3">
          <Captions
            className={cn("mt-0.5 shrink-0 text-white/70", compact ? "h-4 w-4" : "h-5 w-5")}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            {segment?.speakerName ? (
              <p className="truncate text-xs font-semibold text-white/70">{segment.speakerName}</p>
            ) : null}
            <p
              className={cn(
                "mt-0.5 break-words leading-relaxed",
                compact ? "line-clamp-2 text-sm" : "line-clamp-3 text-sm sm:text-base",
              )}
            >
              {text}
            </p>
          </div>
          {onOpenPanel ? (
            <button
              type="button"
              onClick={onOpenPanel}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              title={t("transcription.openPanel")}
              aria-label={t("transcription.openPanel")}
            >
              <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

