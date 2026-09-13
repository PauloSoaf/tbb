"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Mic, ShieldCheck } from "lucide-react";
import {
  classifyRealtimeAudioCaptureError,
  useRealtimeAudioCapture,
} from "@/hooks/transcription";
import { useI18n } from "@/lib/i18n/I18nContext";
import {
  createRealtimeTranscriptionProvider,
  type LiveTranscriptionSegment,
} from "@/services/transcription/providers";
import type { RealtimeTranscriptSegment } from "./realtime";

type SessionInfo = {
  id: string;
  status: string;
  provider: "speaches" | "whisper_live" | "whisper_cpp" | "vosk" | "mock";
  model: string | null;
  language: string;
  sampleRate: number | null;
  chunkMs: number | null;
};

interface Props {
  careSessionId: string;
  joinToken?: string | null;
  sessionActive: boolean;
  onPartialSegmentChange?: (segment: RealtimeTranscriptSegment | null) => void;
}

export function PatientRealtimeTranscriptionCapture(props: Props) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [noticeRequired, setNoticeRequired] = useState(true);

  useEffect(() => {
    if (!props.sessionActive) return;
    let disposed = false;
    const check = async () => {
      const query = new URLSearchParams({ careSessionId: props.careSessionId });
      if (props.joinToken) query.set("joinToken", props.joinToken);
      const response = await fetch(`/api/transcription/patient-session?${query}`, {
        cache: "no-store",
      });
      if (!response.ok || disposed) return;
      const data = await response.json();
      setNoticeRequired(data.noticeRequired ?? true);
      setSession(data.transcript ?? null);
    };
    void check();
    const interval = setInterval(() => void check(), 5_000);
    return () => {
      disposed = true;
      clearInterval(interval);
    };
  }, [props.careSessionId, props.joinToken, props.sessionActive]);

  if (!session) return null;
  return (
    <PatientCaptureSession
      key={session.id}
      {...props}
      session={session}
      noticeRequired={noticeRequired}
    />
  );
}

function PatientCaptureSession({
  careSessionId,
  joinToken,
  sessionActive,
  session,
  noticeRequired,
  onPartialSegmentChange,
}: Props & { session: SessionInfo; noticeRequired: boolean }) {
  const { t } = useI18n();
  const provider = useMemo(
    () => createRealtimeTranscriptionProvider(session.provider),
    [session.provider]
  );
  const [acknowledged, setAcknowledged] = useState(!noticeRequired);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(false);
  const queueRef = useRef<LiveTranscriptionSegment[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const post = useCallback(
    (body: Record<string, unknown>) =>
      fetch("/api/transcription/patient-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          careSessionId,
          transcriptId: session.id,
          joinToken: joinToken ?? undefined,
          ...body,
        }),
      }),
    [careSessionId, joinToken, session.id]
  );

  const flush = useCallback(async () => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const segments = queueRef.current.splice(0, 100);
    if (segments.length === 0) return;
    const response = await post({
      action: "segments",
      segments: segments.map((segment) => ({
        id: segment.id,
        kind: "final",
        text: segment.text,
        confidence: segment.confidence,
        startedAtMs: segment.startedAtMs,
        endedAtMs: segment.endedAtMs,
        clientTimestamp: segment.clientTimestamp,
        providerTimestamp: segment.providerTimestamp,
        source: "PATIENT",
      })),
    });
    if (!response.ok) {
      queueRef.current.unshift(...segments);
      setError(true);
    }
  }, [post]);

  const capture = useRealtimeAudioCapture({
    provider,
    sampleRate: session.sampleRate ?? 16_000,
    chunkMs: session.chunkMs ?? 1_000,
    onError: (captureError) => {
      setError(true);
      const classified = classifyRealtimeAudioCaptureError(captureError);
      void post({
        action: "status",
        audioState:
          classified === "permission_denied" ||
          classified === "device_not_found" ||
          classified === "unsupported"
            ? classified
            : "error",
      });
    },
  });

  useEffect(() => {
    provider.onPartialTranscript((segment) =>
      onPartialSegmentChange?.({
        id: segment.id,
        text: segment.text,
        kind: "partial",
        speakerName: t("transcription.speaker.patient"),
        speakerSource: "PATIENT",
      })
    );
    provider.onFinalTranscript((segment) => {
      onPartialSegmentChange?.(null);
      queueRef.current.push(segment);
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => void flush(), 1_000);
      }
    });
    provider.onError(() => {
      setError(true);
      void post({ action: "status", audioState: "offline" });
    });
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      void flush();
      void provider.disconnect();
    };
  }, [flush, onPartialSegmentChange, post, provider, t]);

  const connect = async () => {
    if (!acknowledged || connecting) return;
    setConnecting(true);
    setError(false);
    try {
      const response = await post({ action: "connect" });
      if (!response.ok) {
        setError(true);
        return;
      }
      const data = await response.json();
      await provider.connect({
        provider: session.provider,
        websocketUrl: data.connection.websocketUrl,
        sessionToken: data.connection.token,
        refreshSession: async () => {
          const refreshedResponse = await post({ action: "connect" });
          if (!refreshedResponse.ok) {
            throw new Error("Unable to refresh the transcription session.");
          }
          const refreshed = await refreshedResponse.json();
          return {
            sessionToken: refreshed.connection.token,
            websocketUrl: refreshed.connection.websocketUrl,
          };
        },
        model: session.model ?? "",
        language: session.language,
        sampleRate: session.sampleRate ?? 16_000,
        chunkMs: session.chunkMs ?? 1_000,
        appointmentId: careSessionId,
        tenantId: "patient-session",
        participantId: data.participantId,
        speakerName: t("transcription.speaker.patient"),
        speakerRole: "PATIENT",
      });
      const captureStarted = await capture.start();
      if (!captureStarted) {
        await provider.disconnect();
        setError(true);
        return;
      }
      setConnected(true);
    } catch {
      await provider.disconnect().catch(() => undefined);
      setError(true);
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    if (!sessionActive && connected) {
      void capture.stop();
      void provider.disconnect();
      queueMicrotask(() => setConnected(false));
    }
  }, [capture, connected, provider, sessionActive]);

  return (
    <div className="border-y border-border-neutral bg-card-bg px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-brand-blue" />
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {t("transcription.consent.title")}
            </p>
            <p className="max-w-2xl text-xs text-text-secondary">
              {t("transcription.patientNotice")} {t("transcription.audioNotSaved")}
            </p>
          </div>
        </div>
        {connected ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" />
            {t("transcription.active")}
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {noticeRequired && (
              <label className="inline-flex items-center gap-2 text-xs text-text-primary">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  className="h-4 w-4 accent-brand-blue"
                />
                {t("transcription.consent.patientAcknowledges")}
              </label>
            )}
            <button
              type="button"
              onClick={() => void connect()}
              disabled={!acknowledged || connecting}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
              {t("transcription.consent.enableMicrophone")}
            </button>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-2 text-xs text-danger">
          {t("transcription.error.captureFailed")}
        </p>
      )}
    </div>
  );
}
