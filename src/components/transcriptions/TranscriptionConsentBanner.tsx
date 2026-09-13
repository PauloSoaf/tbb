"use client";

import { useState } from "react";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface Props {
  consentForRecording: boolean;
  consentForTranscription: boolean;
  onConfirm: (recording: boolean, transcription: boolean) => void;
  readOnly?: boolean;
}

export function TranscriptionConsentBanner({
  consentForRecording,
  consentForTranscription,
  onConfirm,
  readOnly = false,
}: Props) {
  const { t } = useI18n();
  const [recording, setRecording] = useState(consentForRecording);
  const [transcription, setTranscription] = useState(consentForTranscription);

  const allConsented = recording && transcription;

  if (readOnly) {
    return (
      <div className={`rounded-lg p-3 text-sm flex items-start gap-2 ${allConsented ? "bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300" : "bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300"}`}>
        <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">{t("transcriptions.consent.title")}</p>
          <p className="text-xs mt-0.5">
            {t("transcriptions.consent.recording")}: {consentForRecording ? "✓" : "✗"} |{" "}
            {t("transcriptions.consent.transcription")}: {consentForTranscription ? "✓" : "✗"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {t("transcriptions.consent.title")}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {t("transcriptions.consent.required")}
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recording}
                onChange={(e) => setRecording(e.target.checked)}
                className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm text-amber-800 dark:text-amber-300">
                {t("transcriptions.consent.recording")}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={transcription}
                onChange={(e) => setTranscription(e.target.checked)}
                className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm text-amber-800 dark:text-amber-300">
                {t("transcriptions.consent.transcription")}
              </span>
            </label>
          </div>
          {allConsented && (
            <button
              onClick={() => onConfirm(recording, transcription)}
              className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400 hover:text-green-800"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("transcriptions.consent.confirmed")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
