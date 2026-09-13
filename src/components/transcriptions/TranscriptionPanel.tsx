"use client";

import { useState, useTransition, useCallback } from "react";
import { Plus, Loader2, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nContext";
import { TranscriptionStatus, TranscriptionVisibility, TranscriptionProvider } from "@prisma/client";
import { TranscriptionStatusBadge } from "./TranscriptionStatusBadge";
import { TranscriptionEditor } from "./TranscriptionEditor";
import { TranscriptionActions } from "./TranscriptionActions";
import { TranscriptionUploadDropzone } from "./TranscriptionUploadDropzone";
import { TranscriptionConsentBanner } from "./TranscriptionConsentBanner";
import { TranscriptionSegmentsList } from "./TranscriptionSegmentsList";
import {
  createManualTranscriptionAction,
  getPatientTranscriptionsAction,
  getCareSessionTranscriptionsAction,
  getTranscriptionAction,
} from "@/actions/transcription.action";
import type { ConsultationTranscriptionSegment } from "@prisma/client";

type TranscriptionSummary = {
  id: string;
  title: string | null;
  status: TranscriptionStatus;
  visibility: TranscriptionVisibility;
  provider: TranscriptionProvider;
  rawTranscript: string | null;
  editedTranscript: string | null;
  clinicalSummary: string | null;
  patientFriendlySummary: string | null;
  audioUrl: string | null;
  consentForRecording: boolean;
  consentForTranscription: boolean;
  createdAt: Date | string;
  segments: ConsultationTranscriptionSegment[];
};

interface Props {
  tenantSlug: string;
  careSessionId?: string;
  appointmentId?: string;
  patientId: string;
  initialTranscriptions: TranscriptionSummary[];
}

export function TranscriptionPanel({
  tenantSlug,
  careSessionId,
  patientId,
  initialTranscriptions,
}: Props) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [transcriptions, setTranscriptions] = useState<TranscriptionSummary[]>(initialTranscriptions);
  const [expandedId, setExpandedId] = useState<string | null>(
    initialTranscriptions.length === 1 ? initialTranscriptions[0].id : null
  );
  const [creating, setCreating] = useState(false);
  const [manualText, setManualText] = useState("");

  const reload = useCallback(() => {
    startTransition(async () => {
      const res = careSessionId
        ? await getCareSessionTranscriptionsAction(tenantSlug, careSessionId)
        : await getPatientTranscriptionsAction(tenantSlug, patientId);
      if (res.success && res.transcriptions) {
        const withSegments = await Promise.all(
          res.transcriptions.map(async (tr) => {
            const detail = await getTranscriptionAction(tenantSlug, tr.id);
            return { ...tr, segments: detail.transcription?.segments ?? [] } as TranscriptionSummary;
          })
        );
        setTranscriptions(withSegments);
      }
    });
  }, [tenantSlug, careSessionId, patientId]);

  function handleCreate() {
    startTransition(async () => {
      const res = await createManualTranscriptionAction(tenantSlug, {
        patientId,
        careSessionId,
        rawTranscript: manualText.trim() || undefined,
        title: "Transcrição manual",
        consentForRecording: false,
        consentForTranscription: true,
        language: "pt-BR",
      });
      if (res.success && res.transcription) {
        toast.success(t("transcriptions.toasts.saved"));
        setManualText("");
        setCreating(false);
        setExpandedId(res.transcription.id);
        reload();
      } else {
        toast.error(res.error ?? "Erro ao criar transcrição.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          {t("transcriptions.title")}
          {transcriptions.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">({transcriptions.length})</span>
          )}
        </h3>
        <button
          onClick={() => setCreating(!creating)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("transcriptions.actions.create_manual")}
        </button>
      </div>

      {creating && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Nova transcrição manual</p>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={6}
            placeholder={t("transcriptions.fields.raw_transcript")}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setCreating(false); setManualText(""); }}
              className="px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted/50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("transcriptions.actions.save")}
            </button>
          </div>
        </div>
      )}

      {transcriptions.length === 0 && !creating && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("transcriptions.empty.no_transcriptions_description")}</p>
        </div>
      )}

      <div className="space-y-3">
        {transcriptions.map((tr) => (
          <TranscriptionCard
            key={tr.id}
            transcription={tr}
            tenantSlug={tenantSlug}
            isExpanded={expandedId === tr.id}
            onToggle={() => setExpandedId(expandedId === tr.id ? null : tr.id)}
            onChanged={reload}
            onDeleted={reload}
          />
        ))}
      </div>

      {isPending && transcriptions.length === 0 && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function TranscriptionCard({
  transcription: tr,
  tenantSlug,
  isExpanded,
  onToggle,
  onChanged,
  onDeleted,
}: {
  transcription: TranscriptionSummary;
  tenantSlug: string;
  isExpanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <TranscriptionStatusBadge status={tr.status} />
            {tr.visibility === "PATIENT_VISIBLE" && (
              <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
                Visível ao paciente
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-foreground mt-1 truncate">
            {tr.title ?? t("transcriptions.title")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t(`transcriptions.provider.${tr.provider.toLowerCase()}`)} ·{" "}
            {new Date(tr.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {isExpanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          <TranscriptionConsentBanner
            consentForRecording={tr.consentForRecording}
            consentForTranscription={tr.consentForTranscription}
            onConfirm={() => {}}
            readOnly
          />

          {!tr.audioUrl && !tr.rawTranscript && (
            <TranscriptionUploadDropzone
              transcriptionId={tr.id}
              tenantSlug={tenantSlug}
              onUploaded={onChanged}
            />
          )}

          {tr.audioUrl && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Áudio</p>
              <audio controls src={tr.audioUrl} className="w-full h-10 rounded" />
            </div>
          )}

          <TranscriptionActions
            transcriptionId={tr.id}
            tenantSlug={tenantSlug}
            status={tr.status}
            visibility={tr.visibility}
            editedTranscript={tr.editedTranscript}
            rawTranscript={tr.rawTranscript}
            hasAudio={!!tr.audioUrl}
            onChanged={onChanged}
            onDeleted={onDeleted}
          />

          <TranscriptionEditor
            transcriptionId={tr.id}
            tenantSlug={tenantSlug}
            editedTranscript={tr.editedTranscript}
            rawTranscript={tr.rawTranscript}
            clinicalSummary={tr.clinicalSummary}
            patientFriendlySummary={tr.patientFriendlySummary}
            status={tr.status}
            onSaved={onChanged}
          />

          {tr.segments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Segmentos ({tr.segments.length})
              </p>
              <TranscriptionSegmentsList segments={tr.segments} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
