"use client";

import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { TranscriptionStatusBadge } from "@/components/transcriptions/TranscriptionStatusBadge";
import { TranscriptionEditor } from "@/components/transcriptions/TranscriptionEditor";
import { TranscriptionActions } from "@/components/transcriptions/TranscriptionActions";
import { TranscriptionConsentBanner } from "@/components/transcriptions/TranscriptionConsentBanner";
import type { TranscriptionCardData } from "./PatientTranscriptionCard";

interface Props {
  transcription: TranscriptionCardData;
  tenantSlug: string;
  onClose: () => void;
}

export function TranscriptionDetailDrawer({ transcription: tr, tenantSlug, onClose }: Props) {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-2xl bg-background border-l border-border shadow-2xl flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <TranscriptionStatusBadge status={tr.status} />
            <span className="text-sm font-semibold text-foreground">
              {tr.title ?? t("transcriptions.title")}
            </span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{t(`transcriptions.provider.${tr.provider.toLowerCase()}`)}</span>
            <span>·</span>
            <span>{new Date(tr.createdAt).toLocaleDateString("pt-BR")}</span>
          </div>

          <TranscriptionConsentBanner
            consentForRecording={tr.consentForRecording ?? false}
            consentForTranscription={tr.consentForTranscription ?? false}
            onConfirm={() => {}}
            readOnly
          />

          <TranscriptionActions
            transcriptionId={tr.id}
            tenantSlug={tenantSlug}
            status={tr.status}
            visibility={tr.visibility}
            editedTranscript={tr.editedTranscript}
            rawTranscript={tr.rawTranscript}
            hasAudio={false}
            onChanged={onClose}
            onDeleted={onClose}
          />

          <TranscriptionEditor
            transcriptionId={tr.id}
            tenantSlug={tenantSlug}
            editedTranscript={tr.editedTranscript}
            rawTranscript={tr.rawTranscript}
            clinicalSummary={tr.clinicalSummary}
            patientFriendlySummary={null}
            status={tr.status}
            onSaved={onClose}
          />
        </div>
      </div>
    </div>
  );
}
