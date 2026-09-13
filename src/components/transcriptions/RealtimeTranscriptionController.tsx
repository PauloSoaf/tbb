"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  attachTranscriptionToMedicalRecordAction,
  bulkAppendFinalTranscriptSegmentsAction,
  createTranscriptionSessionTokenAction,
  discardTranscriptionAction,
  getActiveTranscriptionSessionAction,
  pauseTranscriptionAction,
  resumeTranscriptionAction,
  saveTranscriptionAction,
  startAutomaticTranscriptionAction,
  stopTranscriptionAction,
  updateTranscriptSegmentSpeakerAction,
  updateTranscriptionParticipantAction,
} from "@/actions/transcription.action";
import {
  classifyRealtimeAudioCaptureError,
  useRealtimeAudioCapture,
} from "@/hooks/transcription";
import { useI18n } from "@/lib/i18n/I18nContext";
import {
  createRealtimeTranscriptionProvider,
  type LiveTranscriptionSegment,
  type TranscriptionConnectionStatus,
} from "@/services/transcription/providers";
import {
  AttachTranscriptToMedicalRecordDialog,
  AutomaticTranscriptionPanel,
  EditTranscriptSpeakerDialog,
  type RealtimeTranscriptSegment,
  type RealtimeTranscriptionStatus,
  type TranscriptionParticipantState,
  type TranscriptionProviderInfo,
  type TranscriptionSpeakerSource,
} from "@/components/transcriptions/realtime";

type Settings = {
  enabled: boolean;
  autoStartOnlineAppointments: boolean;
  autoStartInPersonAppointments: boolean;
  requirePatientNotice: boolean;
  requireInPersonConfirmation: boolean;
  saveTranscriptByDefault: boolean;
  attachToMedicalRecordByDefault: boolean;
  provider: "speaches" | "whisper_live" | "whisper_cpp" | "vosk" | "mock";
  model: string;
  language: string;
  sampleRate: number;
  chunkMs: number;
  maxSessionMinutes: number | null;
};

type InitialTranscript = {
  id: string;
  status: string;
  provider: string;
  model: string | null;
  language: string;
  segmentCount: number;
  durationSeconds: number | null;
  startedAt: string | Date | null;
  participants: Array<{
    participantId: string;
    speakerNameSnapshot: string | null;
    source: string;
    audioState: string;
  }>;
  segments: Array<{
    id: string;
    segmentKey: string;
    text: string;
    speakerNameSnapshot: string | null;
    source: string;
    startedAtMs: number | null;
    endedAtMs: number | null;
    clientTimestamp: string | Date | null;
    confidence: number | null;
  }>;
};

interface Props {
  tenantSlug: string;
  careSessionId: string;
  appointmentId?: string | null;
  patientId: string;
  patientName: string;
  mode: "online" | "in_person";
  sessionActive: boolean;
  settings: Settings;
  initialTranscript?: InitialTranscript | null;
  onPartialSegmentChange?: (segment: RealtimeTranscriptSegment | null) => void;
}

function mapConnectionStatus(
  status: TranscriptionConnectionStatus
): RealtimeTranscriptionStatus {
  const statusMap: Record<TranscriptionConnectionStatus, RealtimeTranscriptionStatus> = {
    idle: "idle",
    connecting: "connecting",
    connected: "connecting",
    streaming: "active",
    reconnecting: "reconnecting",
    stopped: "stopped",
    offline: "offline",
    error: "error",
  };
  return statusMap[status];
}

function toUiSegment(segment: LiveTranscriptionSegment): RealtimeTranscriptSegment {
  return {
    id: segment.id,
    text: segment.text,
    kind: segment.kind,
    participantId: segment.participantId,
    speakerName: segment.speakerNameSnapshot,
    speakerSource: segment.speakerRoleSnapshot,
    startedAtMs: segment.startedAtMs,
    endedAtMs: segment.endedAtMs,
    clientTimestamp: segment.clientTimestamp,
    confidence: segment.confidence,
  };
}

export function RealtimeTranscriptionController({
  tenantSlug,
  careSessionId,
  appointmentId,
  patientId,
  patientName,
  mode,
  sessionActive,
  settings,
  initialTranscript,
  onPartialSegmentChange,
}: Props) {
  const { t } = useI18n();
  const provider = useMemo(
    () => createRealtimeTranscriptionProvider(settings.provider),
    [settings.provider]
  );
  const initialSegments = useMemo<RealtimeTranscriptSegment[]>(
    () =>
      (initialTranscript?.segments ?? []).map((segment) => ({
        id: segment.segmentKey,
        text: segment.text,
        kind: "final",
        speakerName: segment.speakerNameSnapshot ?? undefined,
        speakerSource: segment.source as RealtimeTranscriptSegment["speakerSource"],
        startedAtMs: segment.startedAtMs ?? undefined,
        endedAtMs: segment.endedAtMs ?? undefined,
        clientTimestamp: segment.clientTimestamp
          ? new Date(segment.clientTimestamp).toISOString()
          : undefined,
        confidence: segment.confidence ?? undefined,
      })),
    [initialTranscript]
  );
  const [transcriptId, setTranscriptId] = useState(initialTranscript?.id ?? null);
  const [status, setStatus] = useState<RealtimeTranscriptionStatus>(
    initialTranscript?.status === "PAUSED"
      ? "paused"
      : initialTranscript?.status === "SAVED"
        ? "saved"
        : initialTranscript?.status === "STOPPED"
          ? "stopped"
          : initialTranscript?.id
            ? "idle"
            : "idle"
  );
  const [segments, setSegments] = useState(initialSegments);
  const [remoteParticipants, setRemoteParticipants] = useState(
    initialTranscript?.participants ?? []
  );
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(
    initialTranscript?.startedAt
      ? new Date(initialTranscript.startedAt).getTime()
      : null
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(
    initialTranscript?.durationSeconds ?? 0
  );
  const [partialSegment, setPartialSegment] = useState<RealtimeTranscriptSegment | null>(null);
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [providerInfo, setProviderInfo] = useState<TranscriptionProviderInfo>({
    name: settings.provider,
    model: settings.model,
    language: settings.language,
    health: "checking",
  });
  const [error, setError] = useState<{ descriptionKey: string; code?: string; recoverable?: boolean } | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [editingSegment, setEditingSegment] =
    useState<RealtimeTranscriptSegment | null>(null);
  const [speakerUpdating, setSpeakerUpdating] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "start" | "pause" | "resume" | "stop" | "save" | "discard" | "attach" | "retry" | undefined
  >();
  const [isPending, startTransition] = useTransition();
  const finalQueueRef = useRef<LiveTranscriptionSegment[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartAttemptedRef = useRef(false);
  const startPendingRef = useRef(false);
  const transcriptIdRef = useRef(transcriptId);
  useEffect(() => {
    transcriptIdRef.current = transcriptId;
  }, [transcriptId]);

  const capture = useRealtimeAudioCapture({
    provider,
    sampleRate: settings.sampleRate,
    chunkMs: settings.chunkMs,
    onError: (captureError) => {
      const captureStatus = classifyRealtimeAudioCaptureError(captureError);
      setError({
        code: "AUDIO_CAPTURE_ERROR",
        descriptionKey: "transcription.error.captureFailed",
        recoverable: true,
      });
      setStatus("error");
      const activeTranscriptId = transcriptIdRef.current;
      if (activeTranscriptId) {
        void updateTranscriptionParticipantAction(tenantSlug, {
          transcriptId: activeTranscriptId,
          participantId: `nutritionist:${careSessionId}`,
          speakerNameSnapshot: t("care_session.role_nutritionist"),
          source: mode === "in_person" ? "IN_PERSON_ROOM" : "NUTRITIONIST",
          audioState:
            captureStatus === "permission_denied" ||
            captureStatus === "device_not_found" ||
            captureStatus === "unsupported"
              ? captureStatus
              : "error",
        });
      }
    },
  });

  const flushSegments = useCallback(async () => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const activeTranscriptId = transcriptIdRef.current;
    if (!activeTranscriptId) return;
    while (finalQueueRef.current.length > 0) {
      const batch = finalQueueRef.current.splice(0, 100);
      const result = await bulkAppendFinalTranscriptSegmentsAction(
        tenantSlug,
        activeTranscriptId,
        batch.map((segment) => ({
          id: segment.id,
          participantId: segment.participantId,
          speakerNameSnapshot: segment.speakerNameSnapshot,
          speakerRoleSnapshot: segment.speakerRoleSnapshot,
          source: segment.speakerRoleSnapshot ?? "UNKNOWN",
          kind: "final",
          text: segment.text,
          confidence: segment.confidence,
          startedAtMs: segment.startedAtMs,
          endedAtMs: segment.endedAtMs,
          clientTimestamp: segment.clientTimestamp,
          providerTimestamp: segment.providerTimestamp,
        }))
      );
      if (!result.success) {
        finalQueueRef.current.unshift(...batch);
        throw new Error(result.error);
      }
    }
  }, [tenantSlug]);

  useEffect(() => {
    provider.onPartialTranscript((segment) => {
      const uiSegment = toUiSegment(segment);
      setPartialSegment(uiSegment);
      onPartialSegmentChange?.(uiSegment);
    });
    provider.onFinalTranscript((segment) => {
      const uiSegment = toUiSegment(segment);
      setSegments((current) =>
        current.some((item) => item.id === uiSegment.id)
          ? current
          : [...current, uiSegment]
      );
      setPartialSegment(null);
      onPartialSegmentChange?.(null);
      finalQueueRef.current.push(segment);
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          void flushSegments().catch(() => {
            setError({
              code: "SEGMENT_PERSIST_FAILED",
              descriptionKey: "transcription.error.persistFailed",
              recoverable: true,
            });
          });
        }, 1_000);
      }
    });
    provider.onStatusChange((next) => {
      setStatus(mapConnectionStatus(next));
      setProviderInfo((current) => ({
        ...current,
        health:
          next === "streaming" || next === "connected"
            ? "online"
            : next === "reconnecting"
              ? "reconnecting"
              : next === "offline"
                ? "offline"
                : next === "error"
                  ? "degraded"
                  : current.health,
      }));
    });
    provider.onError(() => {
      setError({
        code: "PROVIDER_UNAVAILABLE",
        descriptionKey: "transcription.error.providerUnavailable",
        recoverable: true,
      });
    });
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      void provider.disconnect();
    };
  }, [flushSegments, onPartialSegmentChange, provider]);

  useEffect(() => {
    if (!["active", "paused", "reconnecting"].includes(status)) return;
    const refresh = async () => {
      const result = await getActiveTranscriptionSessionAction(
        tenantSlug,
        careSessionId
      );
      if (!result.success || !result.transcript) return;
      setSegments(
        result.transcript.segments.map((segment) => ({
          id: segment.segmentKey,
          text: segment.text,
          kind: "final" as const,
          participantId: segment.participantId ?? undefined,
          speakerName: segment.speakerNameSnapshot ?? undefined,
          speakerSource: segment.source,
          startedAtMs: segment.startedAtMs ?? undefined,
          endedAtMs: segment.endedAtMs ?? undefined,
          clientTimestamp: segment.clientTimestamp?.toISOString(),
          confidence: segment.confidence ?? undefined,
        }))
      );
      setRemoteParticipants(result.transcript.participants);
    };
    const interval = setInterval(() => void refresh(), 3_000);
    return () => clearInterval(interval);
  }, [careSessionId, status, tenantSlug]);

  const startWithPendingAction = useCallback((action: "start" | "retry") => {
    if (!sessionActive || isPending || startPendingRef.current) return;

    startPendingRef.current = true;
    setPendingAction(action);
    startTransition(async () => {
      try {
        const started = await startAutomaticTranscriptionAction(tenantSlug, {
          appointmentId: appointmentId ?? undefined,
          careSessionId,
          mode,
          autoStarted: true,
          noticeConfirmed: consentAcknowledged,
          participantId: `nutritionist:${careSessionId}`,
          speakerName: t("care_session.role_nutritionist"),
          speakerRole: mode === "in_person" ? "IN_PERSON_ROOM" : "NUTRITIONIST",
        });
        if (!started.success) {
          setError({
            code: started.code,
            descriptionKey:
              started.code === "NOTICE_REQUIRED"
                ? "transcription.patientNotice"
                : "transcription.error.providerUnavailable",
            recoverable: true,
          });
          return;
        }
        setTranscriptId(started.transcript.id);
        transcriptIdRef.current = started.transcript.id;
        setSessionStartedAt(
          started.transcript.startedAt
            ? new Date(started.transcript.startedAt).getTime()
            : Date.now()
        );
        const token = await createTranscriptionSessionTokenAction(tenantSlug, {
          transcriptId: started.transcript.id,
          participantId: `nutritionist:${careSessionId}`,
        });
        if (!token.success) {
          setError({
            code: token.code,
            descriptionKey: "transcription.error.providerUnavailable",
            recoverable: true,
          });
          return;
        }
        await provider.connect({
          provider: settings.provider,
          websocketUrl: token.connection.websocketUrl,
          sessionToken: token.connection.token,
          refreshSession: async () => {
            const refreshed = await createTranscriptionSessionTokenAction(
              tenantSlug,
              {
                transcriptId: started.transcript.id,
                participantId: `nutritionist:${careSessionId}`,
              }
            );
            if (!refreshed.success) {
              throw new Error(refreshed.error);
            }
            return {
              sessionToken: refreshed.connection.token,
              websocketUrl: refreshed.connection.websocketUrl,
            };
          },
          model: settings.model,
          language: settings.language,
          sampleRate: settings.sampleRate,
          chunkMs: settings.chunkMs,
          appointmentId: appointmentId ?? careSessionId,
          tenantId: tenantSlug,
          participantId: `nutritionist:${careSessionId}`,
          speakerName: t("care_session.role_nutritionist"),
          speakerRole: mode === "in_person" ? "IN_PERSON_ROOM" : "NUTRITIONIST",
        });
        const captureStarted = await capture.start();
        if (!captureStarted) {
          await provider.disconnect();
          setStatus("error");
          return;
        }
        await updateTranscriptionParticipantAction(tenantSlug, {
          transcriptId: started.transcript.id,
          participantId: `nutritionist:${careSessionId}`,
          speakerNameSnapshot: t("care_session.role_nutritionist"),
          source: mode === "in_person" ? "IN_PERSON_ROOM" : "NUTRITIONIST",
          audioState: "capturing",
          noticeAcknowledged: consentAcknowledged,
        });
        setStatus("active");
        setError(null);
      } catch {
        await provider.disconnect().catch(() => undefined);
        setError({
          code: "PROVIDER_UNAVAILABLE",
          descriptionKey: "transcription.error.providerUnavailable",
          recoverable: true,
        });
        setStatus("offline");
      } finally {
        startPendingRef.current = false;
        setPendingAction(undefined);
      }
    });
  }, [
    appointmentId,
    capture,
    careSessionId,
    consentAcknowledged,
    isPending,
    mode,
    provider,
    sessionActive,
    settings,
    t,
    tenantSlug,
  ]);

  const start = useCallback(
    () => startWithPendingAction("start"),
    [startWithPendingAction]
  );
  const retry = useCallback(
    () => startWithPendingAction("retry"),
    [startWithPendingAction]
  );

  const pause = () => {
    if (!transcriptId) return;
    setPendingAction("pause");
    startTransition(async () => {
      capture.pause();
      const result = await pauseTranscriptionAction(tenantSlug, transcriptId);
      if (result.success) setStatus("paused");
      else toast.error(result.error);
      setPendingAction(undefined);
    });
  };

  const resume = () => {
    if (!transcriptId) return;
    setPendingAction("resume");
    startTransition(async () => {
      const result = await resumeTranscriptionAction(tenantSlug, transcriptId);
      if (result.success) {
        await capture.resume();
        setStatus("active");
      } else toast.error(result.error);
      setPendingAction(undefined);
    });
  };

  const stop = useCallback(async () => {
    const activeTranscriptId = transcriptIdRef.current;
    if (!activeTranscriptId) return;
    setPendingAction("stop");
    await capture.stop();
    await provider.disconnect();
    await flushSegments();
    const result = await stopTranscriptionAction(tenantSlug, activeTranscriptId);
    if (!result.success) {
      toast.error(result.error);
      setPendingAction(undefined);
      return;
    }
    setStatus("stopped");
    if (settings.saveTranscriptByDefault) {
      const saved = await saveTranscriptionAction(tenantSlug, activeTranscriptId);
      if (saved.success) {
        setStatus("saved");
        if (settings.attachToMedicalRecordByDefault) setAttachOpen(true);
      }
    }
    setPendingAction(undefined);
  }, [
    capture,
    flushSegments,
    provider,
    settings.attachToMedicalRecordByDefault,
    settings.saveTranscriptByDefault,
    tenantSlug,
  ]);

  useEffect(() => {
    if (
      !sessionStartedAt ||
      !["active", "paused", "reconnecting"].includes(status)
    ) {
      return;
    }
    const updateElapsed = () => {
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000))
      );
    };
    queueMicrotask(updateElapsed);
    const interval = setInterval(updateElapsed, 1_000);
    return () => clearInterval(interval);
  }, [sessionStartedAt, status]);

  const limitStopRequestedRef = useRef(false);
  useEffect(() => {
    const limitSeconds = settings.maxSessionMinutes
      ? settings.maxSessionMinutes * 60
      : null;
    if (
      !limitSeconds ||
      elapsedSeconds < limitSeconds ||
      limitStopRequestedRef.current ||
      !["active", "paused", "reconnecting"].includes(status)
    ) {
      return;
    }
    limitStopRequestedRef.current = true;
    toast.info(t("transcription.sessionLimitReached"));
    void stop();
  }, [elapsedSeconds, settings.maxSessionMinutes, status, stop, t]);

  useEffect(() => {
    if (!sessionActive && ["active", "paused", "reconnecting"].includes(status)) {
      queueMicrotask(() => void stop());
    }
  }, [sessionActive, status, stop]);

  const autoStartEnabled =
    settings.enabled &&
    (mode === "online"
      ? settings.autoStartOnlineAppointments
      : settings.autoStartInPersonAppointments);
  const consentRequired =
    mode === "online"
      ? settings.requirePatientNotice
      : settings.requireInPersonConfirmation;

  useEffect(() => {
    if (
      sessionActive &&
      autoStartEnabled &&
      !consentRequired &&
      !autoStartAttemptedRef.current &&
      status === "idle"
    ) {
      autoStartAttemptedRef.current = true;
      start();
    }
  }, [autoStartEnabled, consentRequired, sessionActive, start, status]);

  const save = () => {
    if (!transcriptId) return;
    setPendingAction("save");
    startTransition(async () => {
      await flushSegments();
      const result = await saveTranscriptionAction(tenantSlug, transcriptId);
      if (result.success) {
        setStatus("saved");
        toast.success(t("transcription.success.saved"));
      } else toast.error(result.error);
      setPendingAction(undefined);
    });
  };

  const discard = () => {
    if (!transcriptId) return;
    setPendingAction("discard");
    startTransition(async () => {
      await capture.stop();
      await provider.disconnect();
      const result = await discardTranscriptionAction(tenantSlug, transcriptId);
      if (result.success) {
        setSegments([]);
        setStatus("discarded");
        toast.success(t("transcription.success.discarded"));
      } else toast.error(result.error);
      setPendingAction(undefined);
    });
  };

  const attach = async (reviewedText: string) => {
    if (!transcriptId) return;
    setPendingAction("attach");
    const result = await attachTranscriptionToMedicalRecordAction(tenantSlug, {
      transcriptId,
      reviewedText,
    });
    if (result.success) {
      setAttachOpen(false);
      toast.success(t("transcription.success.attached"));
    } else toast.error(result.error);
    setPendingAction(undefined);
  };

  const updateSpeaker = async (
    speakerName: string,
    source: TranscriptionSpeakerSource
  ) => {
    if (!transcriptId || !editingSegment) return;
    setSpeakerUpdating(true);
    const result = await updateTranscriptSegmentSpeakerAction(tenantSlug, {
      transcriptId,
      segmentKey: editingSegment.id,
      speakerNameSnapshot: speakerName,
      source,
    });
    if (result.success) {
      setSegments((current) =>
        current.map((segment) =>
          segment.id === editingSegment.id
            ? { ...segment, speakerName, speakerSource: source }
            : segment
        )
      );
      setEditingSegment(null);
      toast.success(t("transcription.success.speakerUpdated"));
    } else {
      toast.error(result.error);
    }
    setSpeakerUpdating(false);
  };

  const segmentDurationSeconds =
    segments.length > 0
      ? Math.ceil(Math.max(...segments.map((segment) => segment.endedAtMs ?? 0)) / 1000)
      : initialTranscript?.durationSeconds ?? 0;
  const durationSeconds = Math.max(segmentDurationSeconds, elapsedSeconds);
  const patientParticipant = remoteParticipants.find(
    (participant) => participant.source === "PATIENT"
  );
  const patientParticipantStatus: TranscriptionParticipantState =
    patientParticipant?.audioState === "capturing"
      ? "transcribing"
      : patientParticipant?.audioState === "permission_denied"
        ? "permission_denied"
        : patientParticipant?.audioState === "paused"
          ? "paused"
          : patientParticipant?.audioState === "error"
            ? "error"
            : "not_connected";
  const participantStatus =
    capture.status === "capturing"
      ? "transcribing"
      : capture.status === "permission_denied"
        ? "permission_denied"
        : capture.status === "paused"
          ? "paused"
          : "ready";

  if (!settings.enabled) return null;

  return (
    <>
      <AutomaticTranscriptionPanel
        status={status}
        captureStatus={capture.status}
        provider={providerInfo}
        participants={[
          {
            id: `nutritionist:${careSessionId}`,
            name:
              mode === "in_person"
                ? t("transcription.speaker.in_person_room")
                : t("care_session.role_nutritionist"),
            source: mode === "in_person" ? "IN_PERSON_ROOM" : "NUTRITIONIST",
            status: participantStatus,
            audioLevel: capture.volume,
            isLocal: true,
          },
          ...(mode === "online"
            ? [{
                id: patientId,
                name: patientName,
                source: "PATIENT" as const,
                status: patientParticipantStatus,
              }]
            : []),
        ]}
        segments={segments}
        partialSegment={partialSegment}
        durationSeconds={durationSeconds}
        error={error}
        pendingAction={pendingAction}
        consent={{
          required: consentRequired && status === "idle",
          mode,
          acknowledged: consentAcknowledged,
          onAcknowledgedChange: setConsentAcknowledged,
          onConfirm: start,
          confirming: pendingAction === "start",
        }}
        disabled={!sessionActive || isPending}
        onStart={start}
        onPause={pause}
        onResume={resume}
        onStop={() => void stop()}
        onSave={save}
        onDiscard={discard}
        onAttachToMedicalRecord={() => setAttachOpen(true)}
        onRetry={retry}
        onDismissError={() => setError(null)}
        onEditSpeaker={setEditingSegment}
      />
      <AttachTranscriptToMedicalRecordDialog
        open={attachOpen}
        initialText={segments.map((segment) => segment.text).join("\n")}
        onOpenChange={setAttachOpen}
        onAttach={attach}
        isSubmitting={pendingAction === "attach"}
      />
      <EditTranscriptSpeakerDialog
        segment={editingSegment}
        onClose={() => setEditingSegment(null)}
        onSave={updateSpeaker}
        isSubmitting={speakerUpdating}
      />
    </>
  );
}
