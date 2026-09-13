"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, MicOff, Save, ShieldCheck, Waves } from "lucide-react";
import { toast } from "sonner";
import { createManualTranscriptionAction } from "@/actions/transcription.action";
import { useI18n } from "@/lib/i18n/I18nContext";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0?: { transcript?: string };
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface LiveTranscriptionRecorderProps {
  tenantSlug: string;
  careSessionId: string;
  patientId: string;
  enabled: boolean;
}

export function LiveTranscriptionRecorder({
  tenantSlug,
  careSessionId,
  patientId,
  enabled,
}: LiveTranscriptionRecorderProps) {
  const { t } = useI18n();
  const router = useRouter();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldListenRef = useRef(false);
  const [supported, setSupported] = useState(() => {
    if (typeof window === "undefined") return true;
    return Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);
  });
  const [listening, setListening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [consented, setConsented] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");

  const transcriptText = useMemo(
    () => [finalTranscript, interimTranscript].filter(Boolean).join(" ").trim(),
    [finalTranscript, interimTranscript]
  );

  const createRecognition = useCallback(() => {
    if (typeof window === "undefined") return null;
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) return null;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "pt-BR";

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result?.[0]?.transcript?.trim();
        if (!text) continue;
        if (result.isFinal) finalChunk += `${text} `;
        else interimChunk += `${text} `;
      }

      if (finalChunk) {
        setFinalTranscript((current) => `${current} ${finalChunk}`.replace(/\s+/g, " ").trim());
      }
      setInterimTranscript(interimChunk.trim());
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") return;
      toast.error(t("transcriptions.live.toasts.error"));
      setListening(false);
      shouldListenRef.current = false;
    };

    recognition.onend = () => {
      if (!shouldListenRef.current) {
        setListening(false);
        return;
      }
      window.setTimeout(() => {
        try {
          recognition.start();
        } catch {
          setListening(false);
          shouldListenRef.current = false;
        }
      }, 250);
    };

    return recognition;
  }, [t]);

  useEffect(() => {
    if (!enabled && listening) {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
    }
  }, [enabled, listening]);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  const start = useCallback(() => {
    if (!enabled) {
      toast(t("transcriptions.live.toasts.enter_call"));
      return;
    }
    if (!consented) {
      toast(t("transcriptions.live.toasts.consent_required"));
      return;
    }

    const recognition = recognitionRef.current ?? createRecognition();
    if (!recognition) {
      setSupported(false);
      return;
    }

    recognitionRef.current = recognition;
    shouldListenRef.current = true;
    setListening(true);

    try {
      recognition.start();
    } catch {
      // Chrome throws if start is called while already listening.
    }
  }, [consented, createRecognition, enabled, t]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    setInterimTranscript("");
  }, []);

  const clear = useCallback(() => {
    setFinalTranscript("");
    setInterimTranscript("");
  }, []);

  const save = useCallback(async () => {
    const text = transcriptText.trim();
    if (!text) {
      toast(t("transcriptions.live.toasts.empty"));
      return;
    }

    if (listening) stop();
    setSaving(true);
    const result = await createManualTranscriptionAction(tenantSlug, {
      patientId,
      careSessionId,
      title: t("transcriptions.live.saved_title"),
      rawTranscript: text,
      language: "pt-BR",
      consentForRecording: false,
      consentForTranscription: true,
    });
    setSaving(false);

    if (result.success) {
      toast.success(t("transcriptions.live.toasts.saved"));
      clear();
      router.refresh();
    } else {
      toast.error(result.error ?? t("transcriptions.live.toasts.save_error"));
    }
  }, [careSessionId, clear, listening, patientId, router, stop, t, tenantSlug, transcriptText]);

  return (
    <div className="rounded-xl border border-brand-blue/20 bg-card-bg p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
            <Waves className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-semibold text-text-primary">{t("transcriptions.live.title")}</h3>
            <p className="mt-1 text-sm text-text-secondary">
              {t("transcriptions.live.description")}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            listening
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-warm-beige text-text-secondary"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${listening ? "animate-pulse bg-emerald-500" : "bg-text-secondary/40"}`} />
          {listening ? t("transcriptions.live.status.live") : t("transcriptions.live.status.stopped")}
        </span>
      </div>

      {!supported && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          {t("transcriptions.live.unsupported")}
        </div>
      )}

      <label className="mt-4 flex items-start gap-2 rounded-lg border border-border-neutral bg-surface-warm px-3 py-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={consented}
          onChange={(event) => setConsented(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border-neutral text-brand-blue focus:ring-brand-blue/30"
        />
        <span className="leading-relaxed">
          <ShieldCheck className="mr-1 inline h-4 w-4 text-brand-blue" />
          {t("transcriptions.live.consent")}
        </span>
      </label>

      <div className="mt-4 min-h-36 rounded-xl border border-border-neutral bg-warm-surface p-3">
        {transcriptText ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
            {finalTranscript}
            {interimTranscript && (
              <span className="text-text-secondary"> {interimTranscript}</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-text-secondary">
            {t("transcriptions.live.placeholder")}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-text-secondary">
          {enabled ? t("transcriptions.live.ready") : t("transcriptions.live.needs_call")}
        </p>
        <div className="flex flex-wrap gap-2">
          {listening ? (
            <button
              type="button"
              onClick={stop}
              className="inline-flex items-center gap-2 rounded-lg border border-border-neutral bg-card-bg px-3 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-rose-300 hover:text-rose-600"
            >
              <MicOff className="h-4 w-4" />
              {t("transcriptions.live.actions.stop")}
            </button>
          ) : (
            <button
              type="button"
              onClick={start}
              disabled={!supported || !enabled}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Mic className="h-4 w-4" />
              {t("transcriptions.live.actions.start")}
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || !transcriptText}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-blue/30 bg-brand-blue/10 px-3 py-2 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blue/15 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("transcriptions.live.actions.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
