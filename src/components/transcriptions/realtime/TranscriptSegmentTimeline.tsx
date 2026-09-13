"use client";

import {
  Check,
  Copy,
  FileText,
  Pencil,
  Search,
  X,
} from "lucide-react";
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";
import { formatDuration } from "./realtime-ui";
import type { RealtimeTranscriptSegment } from "./types";

export interface TranscriptSegmentTimelineProps {
  segments: RealtimeTranscriptSegment[];
  className?: string;
  initialVisibleCount?: number;
  loadMoreCount?: number;
  searchable?: boolean;
  copyable?: boolean;
  onCopySegment?: (segment: RealtimeTranscriptSegment) => void | Promise<void>;
  onCopyAll?: (segments: RealtimeTranscriptSegment[]) => void | Promise<void>;
  onEditSpeaker?: (segment: RealtimeTranscriptSegment) => void;
}

interface SegmentRowProps {
  segment: RealtimeTranscriptSegment;
  locale: "pt" | "en" | "es";
  query: string;
  copied: boolean;
  copyLabel: string;
  editSpeakerLabel: string;
  unknownSpeakerLabel: string;
  unknownTimeLabel: string;
  onCopy?: (segment: RealtimeTranscriptSegment) => void;
  onEditSpeaker?: (segment: RealtimeTranscriptSegment) => void;
}

function getSegmentOrder(segment: RealtimeTranscriptSegment): number {
  if (segment.startedAtMs !== undefined) return segment.startedAtMs;
  if (segment.clientTimestamp) {
    const timestamp = Date.parse(segment.clientTimestamp);
    if (!Number.isNaN(timestamp)) return timestamp;
  }
  return 0;
}

function formatSegmentTime(
  segment: RealtimeTranscriptSegment,
  locale: "pt" | "en" | "es",
  unknownTimeLabel: string,
): string {
  if (segment.startedAtMs !== undefined) {
    return formatDuration(segment.startedAtMs / 1000);
  }

  if (segment.clientTimestamp) {
    const date = new Date(segment.clientTimestamp);
    if (!Number.isNaN(date.getTime())) {
      const localeMap = { pt: "pt-BR", en: "en-US", es: "es-ES" } as const;
      return new Intl.DateTimeFormat(localeMap[locale], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);
    }
  }

  return unknownTimeLabel;
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return text;

  const normalizedText = text.toLocaleLowerCase();
  const normalizedQuery = query.toLocaleLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let matchIndex = normalizedText.indexOf(normalizedQuery);

  while (matchIndex !== -1) {
    if (matchIndex > cursor) {
      parts.push(text.slice(cursor, matchIndex));
    }
    parts.push(
      <mark
        key={`${matchIndex}-${cursor}`}
        className="rounded bg-attention px-0.5 text-attention-text"
      >
        {text.slice(matchIndex, matchIndex + query.length)}
      </mark>,
    );
    cursor = matchIndex + query.length;
    matchIndex = normalizedText.indexOf(normalizedQuery, cursor);
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts;
}

const SegmentRow = memo(function SegmentRow({
  segment,
  locale,
  query,
  copied,
  copyLabel,
  editSpeakerLabel,
  unknownSpeakerLabel,
  unknownTimeLabel,
  onCopy,
  onEditSpeaker,
}: SegmentRowProps) {
  const speakerName = segment.speakerName || unknownSpeakerLabel;
  const time = formatSegmentTime(segment, locale, unknownTimeLabel);

  return (
    <li
      className="group grid grid-cols-[3.75rem_minmax(0,1fr)_auto] gap-2 border-b border-border-neutral px-3 py-3 last:border-b-0 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:gap-3 sm:px-4"
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 88px" }}
    >
      <time className="pt-0.5 font-mono text-[11px] text-text-secondary">{time}</time>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-xs font-semibold text-brand-blue">{speakerName}</p>
          {segment.confidence !== undefined ? (
            <span className="text-[11px] text-text-secondary">
              {Math.round(segment.confidence * 100)}%
            </span>
          ) : null}
        </div>
        <p className="mt-1 break-words text-sm leading-relaxed text-text-primary">
          <HighlightedText text={segment.text} query={query} />
        </p>
      </div>

      <div className="flex items-start gap-1">
        {onEditSpeaker ? (
          <button
            type="button"
            onClick={() => onEditSpeaker(segment)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary opacity-100 transition-colors hover:bg-primary-subtle hover:text-brand-blue focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover:opacity-100"
            aria-label={`${editSpeakerLabel}: ${speakerName}`}
            title={editSpeakerLabel}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
        {onCopy ? (
          <button
            type="button"
            onClick={() => onCopy(segment)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary opacity-100 transition-colors hover:bg-primary-subtle hover:text-brand-blue focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover:opacity-100"
            aria-label={`${copyLabel}: ${speakerName}`}
            title={copyLabel}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>
    </li>
  );
});

export function TranscriptSegmentTimeline({
  segments,
  className,
  initialVisibleCount = 60,
  loadMoreCount = 60,
  searchable = true,
  copyable = true,
  onCopySegment,
  onCopyAll,
  onEditSpeaker,
}: TranscriptSegmentTimelineProps) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyResetTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (copyResetTimer.current) window.clearTimeout(copyResetTimer.current);
    },
    [],
  );

  const sortedSegments = useMemo(
    () => [...segments].sort((left, right) => getSegmentOrder(left) - getSegmentOrder(right)),
    [segments],
  );

  const filteredSegments = useMemo(() => {
    if (!deferredQuery) return sortedSegments;
    const normalizedQuery = deferredQuery.toLocaleLowerCase();

    return sortedSegments.filter((segment) => {
      const searchableText = `${segment.speakerName ?? ""} ${segment.text}`.toLocaleLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [deferredQuery, sortedSegments]);

  const visibleSegments = filteredSegments.slice(0, visibleCount);
  const hasMore = visibleSegments.length < filteredSegments.length;

  const markCopied = useCallback((id: string) => {
    setCopiedId(id);
    if (copyResetTimer.current) window.clearTimeout(copyResetTimer.current);
    copyResetTimer.current = window.setTimeout(() => setCopiedId(null), 1800);
  }, []);

  const copyText = useCallback(async (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  }, []);

  const handleCopySegment = useCallback(
    async (segment: RealtimeTranscriptSegment) => {
      if (onCopySegment) {
        await onCopySegment(segment);
      } else {
        await copyText(segment.text);
      }
      markCopied(segment.id);
    },
    [copyText, markCopied, onCopySegment],
  );

  const handleCopyAll = useCallback(async () => {
    if (onCopyAll) {
      await onCopyAll(filteredSegments);
    } else {
      await copyText(
        filteredSegments
          .map((segment) =>
            segment.speakerName
              ? `${segment.speakerName}: ${segment.text}`
              : segment.text,
          )
          .join("\n\n"),
      );
    }
    markCopied("all");
  }, [copyText, filteredSegments, markCopied, onCopyAll]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setVisibleCount(initialVisibleCount);
  };

  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border-neutral bg-card-bg",
        className,
      )}
      aria-labelledby={titleId}
    >
      <div className="border-b border-border-neutral p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-brand-blue" aria-hidden="true" />
            <h3
              id={titleId}
              className="text-sm font-semibold text-text-primary"
            >
              {t("transcription.timeline.title")}
            </h3>
            <span className="rounded-full bg-warm-surface px-2 py-0.5 text-xs text-text-secondary">
              {filteredSegments.length}
            </span>
          </div>

          {copyable && filteredSegments.length > 0 ? (
            <button
              type="button"
              onClick={handleCopyAll}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border-neutral bg-card-bg px-3 text-xs font-semibold text-text-primary transition-colors hover:border-brand-blue/40 hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copiedId === "all" ? (
                <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {t(
                copiedId === "all"
                  ? "transcription.timeline.copied"
                  : "transcription.timeline.copyAll",
              )}
            </button>
          ) : null}
        </div>

        {searchable ? (
          <div className="relative mt-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder={t("transcription.timeline.search")}
              aria-label={t("transcription.timeline.search")}
              className="h-10 w-full rounded-lg border border-border-neutral bg-background pl-9 pr-10 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-brand-blue focus:ring-2 focus:ring-ring"
            />
            {query ? (
              <button
                type="button"
                onClick={() => handleQueryChange("")}
                className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-primary-subtle hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t("transcription.timeline.clearSearch")}
                title={t("transcription.timeline.clearSearch")}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {visibleSegments.length > 0 ? (
        <>
          <ol className="max-h-[32rem] overflow-y-auto overscroll-contain">
            {visibleSegments.map((segment) => (
              <SegmentRow
                key={segment.id}
                segment={segment}
                locale={locale}
                query={deferredQuery}
                copied={copiedId === segment.id}
                copyLabel={t("transcription.timeline.copySegment")}
                editSpeakerLabel={t("transcription.timeline.editSpeaker")}
                unknownSpeakerLabel={t("transcription.timeline.unknownSpeaker")}
                unknownTimeLabel={t("transcription.timeline.unknownTime")}
                onCopy={copyable ? handleCopySegment : undefined}
                onEditSpeaker={onEditSpeaker}
              />
            ))}
          </ol>

          {hasMore ? (
            <div className="border-t border-border-neutral p-3 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + loadMoreCount)}
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-border-neutral bg-card-bg px-4 text-xs font-semibold text-text-primary transition-colors hover:border-brand-blue/40 hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("transcription.timeline.showMore")}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="px-4 py-10 text-center">
          <FileText className="mx-auto h-7 w-7 text-text-secondary" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-text-primary">
            {t(
              deferredQuery
                ? "transcription.timeline.noResults"
                : "transcription.timeline.empty",
            )}
          </p>
          {deferredQuery ? (
            <p className="mt-1 text-xs text-text-secondary">
              {t("transcription.timeline.tryAnotherSearch")}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
