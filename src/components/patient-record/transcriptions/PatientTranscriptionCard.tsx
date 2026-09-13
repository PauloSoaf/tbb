"use client";

import { FileText, Eye, EyeOff } from "lucide-react";
import { TranscriptionStatusBadge } from "@/components/transcriptions/TranscriptionStatusBadge";
import type { TranscriptionStatus, TranscriptionVisibility, TranscriptionProvider } from "@prisma/client";
import { useI18n } from "@/lib/i18n/I18nContext";

export type TranscriptionCardData = {
  id: string;
  title: string | null;
  status: TranscriptionStatus;
  visibility: TranscriptionVisibility;
  provider: TranscriptionProvider;
  clinicalSummary: string | null;
  editedTranscript: string | null;
  rawTranscript: string | null;
  careSessionId: string | null;
  appointmentId: string | null;
  consentForRecording: boolean;
  consentForTranscription: boolean;
  createdAt: Date | string;
};

interface Props {
  transcription: TranscriptionCardData;
  onOpen: (id: string) => void;
}

export function PatientTranscriptionCard({ transcription: tr, onOpen }: Props) {
  const { t } = useI18n();
  const preview = (tr.clinicalSummary ?? tr.editedTranscript ?? tr.rawTranscript ?? "").slice(0, 120);

  return (
    <div
      onClick={() => onOpen(tr.id)}
      className="rounded-xl border border-border bg-card hover:bg-muted/30 cursor-pointer transition-colors p-4 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <TranscriptionStatusBadge status={tr.status} />
          {tr.visibility === "PATIENT_VISIBLE" ? (
            <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
              <Eye className="h-3 w-3" />Visível ao paciente
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <EyeOff className="h-3 w-3" />Privada
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {new Date(tr.createdAt).toLocaleDateString("pt-BR")}
        </span>
      </div>

      <div className="flex items-start gap-2">
        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {tr.title ?? t("transcriptions.title")}
          </p>
          {preview && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
              {preview}{preview.length === 120 ? "..." : ""}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {t(`transcriptions.provider.${tr.provider.toLowerCase()}`)}
          </p>
        </div>
      </div>
    </div>
  );
}
