"use client";

import type { ConsultationTranscriptionSegment } from "@prisma/client";

interface Props {
  segments: ConsultationTranscriptionSegment[];
}

function formatTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "";
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function TranscriptionSegmentsList({ segments }: Props) {
  if (!segments.length) return null;

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
      {segments.map((seg) => (
        <div key={seg.id} className="flex gap-3 text-sm">
          <div className="flex-shrink-0 w-16 text-xs text-muted-foreground font-mono pt-0.5">
            {seg.startSeconds !== null ? formatTime(seg.startSeconds) : "--:--"}
          </div>
          <div className="flex-1">
            {seg.speakerLabel && (
              <span className="text-xs font-semibold text-primary mr-1.5">{seg.speakerLabel}</span>
            )}
            <span className="text-foreground leading-relaxed">{seg.text}</span>
            {seg.confidence !== null && seg.confidence !== undefined && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({Math.round(seg.confidence * 100)}%)
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
