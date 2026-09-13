"use client";

import { useState } from "react";
import {
  AudioLines,
  CalendarDays,
  Clock3,
  Download,
  Link2,
  Loader2,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  attachTranscriptionToMedicalRecordAction,
  deleteTranscriptionAction,
  exportRealtimeTranscriptionAction,
} from "@/actions/transcription.action";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useI18n } from "@/lib/i18n/I18nContext";
import {
  AttachTranscriptToMedicalRecordDialog,
  TranscriptSegmentTimeline,
  TranscriptionStatusBadge,
  type RealtimeTranscriptSegment,
} from "@/components/transcriptions/realtime";

type Transcript = {
  id: string;
  status: string;
  provider: string;
  model: string | null;
  language: string;
  segmentCount: number;
  durationSeconds: number | null;
  savedAt: string | null;
  createdAt: string;
  savedBy: { name: string; email: string } | null;
  segments: Array<{
    segmentKey: string;
    text: string;
    participantId: string | null;
    speakerNameSnapshot: string | null;
    source: string;
    startedAtMs: number | null;
    endedAtMs: number | null;
    clientTimestamp: string | null;
    confidence: number | null;
  }>;
};

export function PatientRealtimeTranscriptionHistory({
  transcriptions,
  tenantSlug,
  canDelete,
  canExport,
  canAttach,
}: {
  transcriptions: Transcript[];
  tenantSlug: string;
  canDelete: boolean;
  canExport: boolean;
  canAttach: boolean;
}) {
  const { t } = useI18n();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [items, setItems] = useState(transcriptions);
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [pending, setPending] = useState<"delete" | "export" | "attach" | null>(
    null
  );
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const segments: RealtimeTranscriptSegment[] =
    selected?.segments.map((segment) => ({
      id: segment.segmentKey,
      text: segment.text,
      kind: "final",
      participantId: segment.participantId ?? undefined,
      speakerName: segment.speakerNameSnapshot ?? undefined,
      speakerSource: segment.source as RealtimeTranscriptSegment["speakerSource"],
      startedAtMs: segment.startedAtMs ?? undefined,
      endedAtMs: segment.endedAtMs ?? undefined,
      clientTimestamp: segment.clientTimestamp ?? undefined,
      confidence: segment.confidence ?? undefined,
    })) ?? [];

  const exportSelected = async () => {
    if (!selected) return;
    setPending("export");
    try {
      const result = await exportRealtimeTranscriptionAction(
        tenantSlug,
        selected.id
      );
      if (result.success) {
        const url = URL.createObjectURL(
          new Blob([result.text], { type: "text/plain;charset=utf-8" })
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(null);
    }
  };

  const deleteSelected = async () => {
    if (!selected) return;
    const confirmed = await confirm({
      title: t("transcription.history.deleteTitle"),
      description: t("transcription.history.deleteDescription"),
      confirmLabel: t("transcription.delete"),
      tone: "danger",
    });
    if (!confirmed) return;
    setPending("delete");
    try {
      const result = await deleteTranscriptionAction(tenantSlug, selected.id);
      if (result.success) {
        const remaining = items.filter((item) => item.id !== selected.id);
        setItems(remaining);
        setSelectedId(remaining[0]?.id ?? null);
        toast.success(t("transcription.success.deleted"));
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(null);
    }
  };

  const attachSelected = async (reviewedText: string) => {
    if (!selected) return;
    setPending("attach");
    try {
      const result = await attachTranscriptionToMedicalRecordAction(tenantSlug, {
        transcriptId: selected.id,
        reviewedText,
      });
      if (result.success) {
        setAttachOpen(false);
        toast.success(t("transcription.success.attached"));
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(null);
    }
  };

  if (items.length === 0) return null;
  return (
    <section className="border-y border-border-neutral bg-card-bg py-5">
      <div className="mb-4 flex items-center gap-2">
        <AudioLines className="h-5 w-5 text-brand-blue" />
        <h2 className="font-semibold text-text-primary">
          {t("transcription.history.title")}
        </h2>
        <span className="text-xs text-text-secondary">({items.length})</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="space-y-2">
          {items.map((transcript) => (
            <button
              key={transcript.id}
              type="button"
              onClick={() => setSelectedId(transcript.id)}
              className={`w-full border-l-2 p-3 text-left transition-colors ${
                selectedId === transcript.id
                  ? "border-brand-blue bg-primary-subtle"
                  : "border-border-neutral hover:bg-warm-surface"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-text-primary">
                  {new Date(transcript.savedAt ?? transcript.createdAt).toLocaleDateString()}
                </span>
                <TranscriptionStatusBadge
                  status={transcript.status === "SAVED" ? "saved" : "stopped"}
                />
              </div>
              <p className="mt-1 truncate text-xs text-text-secondary">
                {transcript.provider} | {transcript.model}
              </p>
            </button>
          ))}
        </div>
        {selected && (
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-4 text-xs text-text-secondary">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(selected.savedAt ?? selected.createdAt).toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {Math.ceil((selected.durationSeconds ?? 0) / 60)} min
              </span>
              <span>{selected.segmentCount} {t("transcription.segments").toLowerCase()}</span>
              {selected.savedBy && (
                <span className="inline-flex items-center gap-1">
                  <UserRound className="h-3.5 w-3.5" />
                  {selected.savedBy.name || selected.savedBy.email}
                </span>
              )}
            </div>
            <div className="mb-3 flex flex-wrap justify-end gap-2">
              {canExport && (
                <button
                  type="button"
                  onClick={() => void exportSelected()}
                  disabled={pending !== null}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-border-neutral px-3 text-xs font-semibold text-text-primary hover:border-brand-blue/40 hover:text-brand-blue disabled:opacity-50"
                >
                  {pending === "export" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {pending === "export" ? t("common.loading", { defaultValue: "Exportando..." }) : t("transcription.export")}
                </button>
              )}
              {canAttach && (
                <button
                  type="button"
                  onClick={() => setAttachOpen(true)}
                  disabled={pending !== null}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-border-neutral px-3 text-xs font-semibold text-text-primary hover:border-brand-blue/40 hover:text-brand-blue disabled:opacity-50"
                >
                  <Link2 className="h-4 w-4" />
                  {t("transcription.attachToMedicalRecord")}
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => void deleteSelected()}
                  disabled={pending !== null}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-danger/25 px-3 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
                >
                  {pending === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {pending === "delete" ? t("common.loading", { defaultValue: "Excluindo..." }) : t("transcription.delete")}
                </button>
              )}
            </div>
            <TranscriptSegmentTimeline segments={segments} />
          </div>
        )}
      </div>
      {confirmDialog}
      <AttachTranscriptToMedicalRecordDialog
        open={attachOpen}
        initialText={segments
          .map((segment) =>
            segment.speakerName
              ? `${segment.speakerName}: ${segment.text}`
              : segment.text
          )
          .join("\n\n")}
        onOpenChange={setAttachOpen}
        onAttach={attachSelected}
        isSubmitting={pending === "attach"}
      />
    </section>
  );
}
