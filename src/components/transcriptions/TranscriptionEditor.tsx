"use client";

import { useState, useTransition } from "react";
import { Save, Loader2, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { toast } from "sonner";
import { updateTranscriptionAction } from "@/actions/transcription.action";
import type { TranscriptionStatus } from "@prisma/client";

interface Props {
  transcriptionId: string;
  tenantSlug: string;
  editedTranscript: string | null;
  rawTranscript: string | null;
  clinicalSummary: string | null;
  patientFriendlySummary: string | null;
  status: TranscriptionStatus;
  readOnly?: boolean;
  onSaved?: () => void;
}

export function TranscriptionEditor({
  transcriptionId,
  tenantSlug,
  editedTranscript,
  rawTranscript,
  clinicalSummary,
  patientFriendlySummary,
  status,
  readOnly = false,
  onSaved,
}: Props) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [edited, setEdited] = useState(editedTranscript ?? rawTranscript ?? "");
  const [summary, setSummary] = useState(clinicalSummary ?? "");
  const [patientSummary, setPatientSummary] = useState(patientFriendlySummary ?? "");

  const isAutomatic = rawTranscript && !["NOT_STARTED", "UPLOADED"].includes(status);

  function handleSave() {
    startTransition(async () => {
      const res = await updateTranscriptionAction(tenantSlug, transcriptionId, {
        editedTranscript: edited || undefined,
        clinicalSummary: summary || undefined,
        patientFriendlySummary: patientSummary || undefined,
      });
      if (res.success) {
        toast.success(t("transcriptions.toasts.saved"));
        onSaved?.();
      } else {
        toast.error(res.error ?? "Erro ao salvar transcrição.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {isAutomatic && (
        <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>
            {t("transcriptions.notice.automatic_may_have_errors")}{" "}
            {t("transcriptions.notice.review_before_clinical_use")}
          </span>
        </div>
      )}

      {rawTranscript && edited !== rawTranscript && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("transcriptions.fields.raw_transcript")}
          </label>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
            {rawTranscript}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("transcriptions.fields.edited_transcript")}
        </label>
        <textarea
          value={edited}
          onChange={(e) => setEdited(e.target.value)}
          readOnly={readOnly}
          rows={8}
          placeholder={t("transcriptions.fields.edited_transcript")}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("transcriptions.fields.clinical_summary")}
        </label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          readOnly={readOnly}
          rows={5}
          placeholder={t("transcriptions.fields.clinical_summary")}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("transcriptions.fields.patient_summary")}
        </label>
        <textarea
          value={patientSummary}
          onChange={(e) => setPatientSummary(e.target.value)}
          readOnly={readOnly}
          rows={4}
          placeholder={t("transcriptions.fields.patient_summary")}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("transcriptions.actions.save")}
          </button>
        </div>
      )}
    </div>
  );
}
