import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import {
  TranscriptSpeakerSource,
  TranscriptStatus,
  type TranscriptionSettings,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  FinalTranscriptSegmentInput,
  StartAutomaticTranscriptionInput,
  UpdateTranscriptSegmentSpeakerInput,
  UpdateTranscriptParticipantInput,
  UpdateTranscriptionSettingsInput,
} from "@/validation/transcription.schema";

const ACTIVE_STATUSES: TranscriptStatus[] = [
  "NOT_STARTED",
  "RECORDING",
  "LIVE",
  "PAUSED",
];

export class TranscriptionDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "TranscriptionDomainError";
  }
}

function yearMonth(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function publicWebsocketUrl() {
  return (
    process.env.TRANSCRIPTION_PUBLIC_WS_URL ??
    process.env.TRANSCRIPTION_WS_URL ??
    "ws://localhost:8010/v1/realtime"
  );
}

async function getOwnedTranscript(tenantId: string, transcriptId: string) {
  const transcript = await prisma.appointmentTranscript.findFirst({
    where: { id: transcriptId, tenantId },
    include: {
      segments: { orderBy: [{ startedAtMs: "asc" }, { createdAt: "asc" }] },
      participants: { orderBy: { createdAt: "asc" } },
      patient: { select: { id: true, name: true } },
    },
  });
  if (!transcript) {
    throw new TranscriptionDomainError("NOT_FOUND", "Transcrição não encontrada.");
  }
  return transcript;
}

async function assertSessionWithinLimit(
  tenantId: string,
  transcript: {
    id: string;
    status: TranscriptStatus;
    startedAt: Date | null;
  }
) {
  if (!transcript.startedAt || !ACTIVE_STATUSES.includes(transcript.status)) return;
  const settings = await getTranscriptionSettings(tenantId);
  if (!settings.maxSessionMinutes) return;
  const elapsedMs = Date.now() - transcript.startedAt.getTime();
  if (elapsedMs < settings.maxSessionMinutes * 60_000) return;
  await prisma.appointmentTranscript.updateMany({
    where: { id: transcript.id, tenantId, status: { in: ACTIVE_STATUSES } },
    data: {
      status: "STOPPED",
      endedAt: new Date(),
      durationSeconds: Math.round(elapsedMs / 1000),
      pausedAt: null,
    },
  });
  throw new TranscriptionDomainError(
    "SESSION_LIMIT_REACHED",
    "O limite configurado para este atendimento foi atingido."
  );
}

async function resolveAppointmentContext(
  tenantId: string,
  input: Pick<StartAutomaticTranscriptionInput, "appointmentId" | "careSessionId">
) {
  if (input.careSessionId) {
    const careSession = await prisma.careSession.findFirst({
      where: { id: input.careSessionId, nutritionistId: tenantId },
      select: {
        id: true,
        appointmentId: true,
        patientId: true,
        mode: true,
        patient: { select: { name: true } },
      },
    });
    if (!careSession) {
      throw new TranscriptionDomainError("NOT_FOUND", "Atendimento não encontrado.");
    }
    if (input.appointmentId && careSession.appointmentId !== input.appointmentId) {
      throw new TranscriptionDomainError("INVALID_APPOINTMENT", "Atendimento inválido.");
    }
    return {
      appointmentId: careSession.appointmentId,
      careSessionId: careSession.id,
      patientId: careSession.patientId,
      patientName: careSession.patient.name,
    };
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, nutritionistId: tenantId },
    select: { id: true, patientId: true, patient: { select: { name: true } } },
  });
  if (!appointment) {
    throw new TranscriptionDomainError("NOT_FOUND", "Consulta não encontrada.");
  }
  return {
    appointmentId: appointment.id,
    careSessionId: null,
    patientId: appointment.patientId,
    patientName: appointment.patient.name,
  };
}

async function incrementUsage(
  tenantId: string,
  provider: string,
  model: string | null,
  data: {
    sessionsStarted?: number;
    sessionsCompleted?: number;
    sessionsFailed?: number;
    minutesTranscribed?: number;
    segmentsCreated?: number;
    providerErrors?: number;
    latencyTotalMs?: number;
    latencySamples?: number;
  }
) {
  const key = {
    tenantId,
    yearMonth: yearMonth(),
    provider,
    model: model ?? "",
  };
  await prisma.transcriptionUsageCounter.upsert({
    where: { tenantId_yearMonth_provider_model: key },
    create: { ...key, ...data },
    update: {
      sessionsStarted: data.sessionsStarted
        ? { increment: data.sessionsStarted }
        : undefined,
      sessionsCompleted: data.sessionsCompleted
        ? { increment: data.sessionsCompleted }
        : undefined,
      sessionsFailed: data.sessionsFailed
        ? { increment: data.sessionsFailed }
        : undefined,
      minutesTranscribed: data.minutesTranscribed
        ? { increment: data.minutesTranscribed }
        : undefined,
      segmentsCreated: data.segmentsCreated
        ? { increment: data.segmentsCreated }
        : undefined,
      providerErrors: data.providerErrors
        ? { increment: data.providerErrors }
        : undefined,
      latencyTotalMs: data.latencyTotalMs
        ? { increment: data.latencyTotalMs }
        : undefined,
      latencySamples: data.latencySamples
        ? { increment: data.latencySamples }
        : undefined,
    },
  });
}

export async function getTranscriptionSettings(
  tenantId: string
): Promise<TranscriptionSettings> {
  return prisma.transcriptionSettings.upsert({
    where: { tenantId },
    update: {},
    create: { tenantId },
  });
}

export async function updateTranscriptionSettings(
  tenantId: string,
  input: UpdateTranscriptionSettingsInput
) {
  return prisma.transcriptionSettings.upsert({
    where: { tenantId },
    create: { tenantId, ...input, saveAudio: false },
    update: { ...input, saveAudio: false },
  });
}

export async function createTranscriptionSession(
  tenantId: string,
  input: StartAutomaticTranscriptionInput
) {
  const [settings, context] = await Promise.all([
    getTranscriptionSettings(tenantId),
    resolveAppointmentContext(tenantId, input),
  ]);
  if (!settings.enabled) {
    throw new TranscriptionDomainError("DISABLED", "Transcrição desativada para esta clínica.");
  }

  const requiresNotice =
    input.mode === "online"
      ? settings.requirePatientNotice
      : settings.requireInPersonConfirmation;
  if (requiresNotice && !input.noticeConfirmed) {
    throw new TranscriptionDomainError(
      "NOTICE_REQUIRED",
      "Confirme que o paciente foi informado antes de iniciar."
    );
  }

  const existing = await prisma.appointmentTranscript.findFirst({
    where: {
      tenantId,
      ...(context.careSessionId
        ? { careSessionId: context.careSessionId }
        : { appointmentId: context.appointmentId }),
      status: { in: ACTIVE_STATUSES },
    },
    include: { segments: true, participants: true },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  const transcript = await prisma.appointmentTranscript.create({
    data: {
      tenantId,
      appointmentId: context.appointmentId,
      careSessionId: context.careSessionId,
      patientId: context.patientId,
      status: "NOT_STARTED",
      provider: settings.provider,
      model: settings.model,
      language: settings.language,
      sampleRate: settings.sampleRate,
      chunkMs: settings.chunkMs,
      autoStarted: input.autoStarted,
      onlineMode: input.mode === "online",
      inPersonMode: input.mode === "in_person",
      saveAudio: false,
      noticeConfirmedAt: input.noticeConfirmed ? new Date() : null,
      participants: {
        create: {
          tenantId,
          participantId: input.participantId,
          speakerNameSnapshot: input.speakerName,
          source: input.speakerRole,
          noticeAcknowledgedAt: input.noticeConfirmed ? new Date() : null,
        },
      },
    },
    include: { segments: true, participants: true },
  });

  if (input.noticeConfirmed) {
    await prisma.consentRecord.create({
      data: {
        tenantId,
        patientId: context.patientId,
        consentType:
          input.mode === "online"
            ? "ONLINE_TRANSCRIPTION_NOTICE"
            : "IN_PERSON_TRANSCRIPTION_CONFIRMATION",
        status: "GRANTED",
        version: "realtime-transcription-v1",
        textSnapshot: "Paciente informado sobre a transcrição do atendimento.",
        source: input.mode === "online" ? "CARE_SESSION" : "MANUAL_CONFIRMATION",
        createdByUserId:
          input.speakerRole === TranscriptSpeakerSource.PATIENT
            ? undefined
            : input.participantId,
        metadata: {
          transcriptId: transcript.id,
          appointmentId: context.appointmentId,
          careSessionId: context.careSessionId,
        },
      },
    });
  }

  return transcript;
}

export async function startTranscriptionSession(
  tenantId: string,
  transcriptId: string
) {
  const transcript = await getOwnedTranscript(tenantId, transcriptId);
  if (!ACTIVE_STATUSES.includes(transcript.status)) {
    throw new TranscriptionDomainError("INVALID_STATE", "A transcrição não pode ser iniciada.");
  }
  const started = await prisma.appointmentTranscript.update({
    where: { id: transcriptId },
    data: { status: "LIVE", startedAt: transcript.startedAt ?? new Date(), pausedAt: null },
    include: { segments: true, participants: true },
  });
  if (transcript.status === "NOT_STARTED") {
    await incrementUsage(tenantId, transcript.provider, transcript.model, {
      sessionsStarted: 1,
    });
  }
  return started;
}

export async function pauseTranscriptionSession(tenantId: string, transcriptId: string) {
  const transcript = await getOwnedTranscript(tenantId, transcriptId);
  if (transcript.status !== "LIVE" && transcript.status !== "RECORDING") {
    throw new TranscriptionDomainError("INVALID_STATE", "A transcrição não está ativa.");
  }
  return prisma.appointmentTranscript.update({
    where: { id: transcriptId },
    data: { status: "PAUSED", pausedAt: new Date() },
  });
}

export async function resumeTranscriptionSession(tenantId: string, transcriptId: string) {
  const transcript = await getOwnedTranscript(tenantId, transcriptId);
  if (transcript.status !== "PAUSED") {
    throw new TranscriptionDomainError("INVALID_STATE", "A transcrição não está pausada.");
  }
  return prisma.appointmentTranscript.update({
    where: { id: transcriptId },
    data: { status: "LIVE", pausedAt: null },
  });
}

export async function stopTranscriptionSession(tenantId: string, transcriptId: string) {
  const transcript = await getOwnedTranscript(tenantId, transcriptId);
  if (!ACTIVE_STATUSES.includes(transcript.status)) return transcript;
  const endedAt = new Date();
  const durationSeconds = transcript.startedAt
    ? Math.max(0, Math.round((endedAt.getTime() - transcript.startedAt.getTime()) / 1000))
    : null;
  return prisma.appointmentTranscript.update({
    where: { id: transcriptId },
    data: { status: "STOPPED", endedAt, durationSeconds, pausedAt: null },
    include: { segments: true, participants: true },
  });
}

export async function finalizeTranscriptionSession(
  tenantId: string,
  transcriptId: string,
  savedByUserId: string
) {
  const transcript = await getOwnedTranscript(tenantId, transcriptId);
  const endedAt = transcript.endedAt ?? new Date();
  const durationSeconds =
    transcript.durationSeconds ??
    (transcript.startedAt
      ? Math.max(0, Math.round((endedAt.getTime() - transcript.startedAt.getTime()) / 1000))
      : null);
  const saved = await prisma.appointmentTranscript.update({
    where: { id: transcriptId },
    data: {
      status: "SAVED",
      endedAt,
      savedAt: new Date(),
      savedByUserId,
      durationSeconds,
    },
    include: { segments: true, participants: true },
  });
  if (transcript.status !== "SAVED") {
    await incrementUsage(tenantId, transcript.provider, transcript.model, {
      sessionsCompleted: 1,
      minutesTranscribed: Math.ceil((durationSeconds ?? 0) / 60),
    });
  }
  return saved;
}

export async function discardTranscriptionSession(tenantId: string, transcriptId: string) {
  const transcript = await getOwnedTranscript(tenantId, transcriptId);
  return prisma.$transaction(async (tx) => {
    await tx.appointmentTranscriptSegment.deleteMany({ where: { transcriptId, tenantId } });
    return tx.appointmentTranscript.update({
      where: { id: transcriptId },
      data: {
        status: "DISCARDED",
        discardedAt: new Date(),
        endedAt: transcript.endedAt ?? new Date(),
        segmentCount: 0,
      },
      include: { segments: true, participants: true },
    });
  });
}

export async function deleteRealtimeTranscription(tenantId: string, transcriptId: string) {
  await getOwnedTranscript(tenantId, transcriptId);
  await prisma.appointmentTranscript.delete({ where: { id: transcriptId } });
}

export async function appendFinalTranscriptSegments(
  tenantId: string,
  transcriptId: string,
  segments: FinalTranscriptSegmentInput[]
) {
  const transcript = await getOwnedTranscript(tenantId, transcriptId);
  await assertSessionWithinLimit(tenantId, transcript);
  if (!ACTIVE_STATUSES.includes(transcript.status) && transcript.status !== "STOPPED") {
    throw new TranscriptionDomainError("INVALID_STATE", "A transcrição não aceita novos segmentos.");
  }

  const result = await prisma.appointmentTranscriptSegment.createMany({
    skipDuplicates: true,
    data: segments.map((segment) => ({
      tenantId,
      transcriptId,
      appointmentId: transcript.appointmentId,
      careSessionId: transcript.careSessionId,
      segmentKey: segment.id,
      participantId: segment.participantId,
      speakerUserId: segment.speakerUserId,
      speakerPatientId: segment.speakerPatientId,
      speakerNameSnapshot: segment.speakerNameSnapshot,
      speakerRoleSnapshot: segment.speakerRoleSnapshot,
      source: segment.source,
      text: segment.text,
      isFinal: true,
      confidence: segment.confidence,
      startedAtMs: segment.startedAtMs,
      endedAtMs: segment.endedAtMs,
      clientTimestamp: new Date(segment.clientTimestamp),
      providerTimestamp: segment.providerTimestamp
        ? new Date(segment.providerTimestamp)
        : undefined,
    })),
  });

  if (result.count > 0) {
    const latencyValues = segments
      .map((segment) => segment.providerLatencyMs)
      .filter((value): value is number => value !== undefined);
    const latencyTotalMs = latencyValues.reduce((sum, value) => sum + value, 0);
    await Promise.all([
      prisma.appointmentTranscript.update({
        where: { id: transcriptId },
        data: {
          segmentCount: { increment: result.count },
          ...(latencyValues.length
            ? { providerLatencyMs: Math.round(latencyTotalMs / latencyValues.length) }
            : {}),
        },
      }),
      incrementUsage(tenantId, transcript.provider, transcript.model, {
        segmentsCreated: result.count,
        latencyTotalMs,
        latencySamples: latencyValues.length,
      }),
    ]);
  }
  return { inserted: result.count };
}

export async function updateTranscriptionParticipant(
  tenantId: string,
  input: UpdateTranscriptParticipantInput
) {
  await getOwnedTranscript(tenantId, input.transcriptId);
  return prisma.appointmentTranscriptParticipant.upsert({
    where: {
      transcriptId_participantId: {
        transcriptId: input.transcriptId,
        participantId: input.participantId,
      },
    },
    create: {
      tenantId,
      transcriptId: input.transcriptId,
      participantId: input.participantId,
      speakerUserId: input.speakerUserId,
      speakerPatientId: input.speakerPatientId,
      speakerNameSnapshot: input.speakerNameSnapshot,
      source: input.source,
      audioState: input.audioState,
      noticeAcknowledgedAt: input.noticeAcknowledged ? new Date() : undefined,
      consentDeclinedAt: input.consentDeclined ? new Date() : undefined,
    },
    update: {
      speakerUserId: input.speakerUserId,
      speakerPatientId: input.speakerPatientId,
      speakerNameSnapshot: input.speakerNameSnapshot,
      source: input.source,
      audioState: input.audioState,
      lastSeenAt: new Date(),
      ...(input.noticeAcknowledged ? { noticeAcknowledgedAt: new Date() } : {}),
      ...(input.consentDeclined ? { consentDeclinedAt: new Date() } : {}),
    },
  });
}

export async function updateTranscriptSegmentSpeaker(
  tenantId: string,
  input: UpdateTranscriptSegmentSpeakerInput
) {
  await getOwnedTranscript(tenantId, input.transcriptId);
  const updated = await prisma.appointmentTranscriptSegment.updateMany({
    where: {
      tenantId,
      transcriptId: input.transcriptId,
      segmentKey: input.segmentKey,
      isFinal: true,
    },
    data: {
      speakerNameSnapshot: input.speakerNameSnapshot,
      source: input.source,
      speakerRoleSnapshot: input.source,
    },
  });
  if (updated.count !== 1) {
    throw new TranscriptionDomainError("NOT_FOUND", "Segmento não encontrado.");
  }
  return prisma.appointmentTranscriptSegment.findUniqueOrThrow({
    where: {
      transcriptId_segmentKey: {
        transcriptId: input.transcriptId,
        segmentKey: input.segmentKey,
      },
    },
  });
}

export async function getActiveTranscriptionSession(
  tenantId: string,
  careSessionId: string
) {
  return prisma.appointmentTranscript.findFirst({
    where: { tenantId, careSessionId, status: { in: ACTIVE_STATUSES } },
    include: {
      segments: { orderBy: [{ startedAtMs: "asc" }, { createdAt: "asc" }] },
      participants: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTranscriptionSessionByAppointment(
  tenantId: string,
  appointmentId: string
) {
  return prisma.appointmentTranscript.findMany({
    where: { tenantId, appointmentId },
    include: { segments: { orderBy: { createdAt: "asc" } }, participants: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTranscriptionSession(tenantId: string, transcriptId: string) {
  return getOwnedTranscript(tenantId, transcriptId);
}

export async function getPatientRealtimeTranscriptions(tenantId: string, patientId: string) {
  return prisma.appointmentTranscript.findMany({
    where: { tenantId, patientId, status: "SAVED" },
    select: {
      id: true,
      appointmentId: true,
      careSessionId: true,
      provider: true,
      model: true,
      language: true,
      segmentCount: true,
      durationSeconds: true,
      savedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function attachTranscriptionToMedicalRecord(
  tenantId: string,
  transcriptId: string,
  reviewedText: string
) {
  const transcript = await getOwnedTranscript(tenantId, transcriptId);
  const note = await prisma.patientNote.create({
    data: {
      nutritionistId: tenantId,
      patientId: transcript.patientId,
      title: "Transcrição do atendimento",
      body: reviewedText,
    },
  });
  await prisma.appointmentTranscript.update({
    where: { id: transcriptId },
    data: { attachedNoteId: note.id },
  });
  return note;
}

export async function recordTranscriptionProviderError(
  tenantId: string,
  transcriptId: string,
  errorCode: string
) {
  const transcript = await getOwnedTranscript(tenantId, transcriptId);
  await Promise.all([
    prisma.appointmentTranscript.update({
      where: { id: transcriptId },
      data: { errorCount: { increment: 1 }, lastErrorCode: errorCode.slice(0, 80) },
    }),
    incrementUsage(tenantId, transcript.provider, transcript.model, {
      providerErrors: 1,
    }),
  ]);
}

export async function getTranscriptionProviderStatus(settings?: TranscriptionSettings) {
  const providerSettings = settings;
  const httpUrl =
    process.env.TRANSCRIPTION_HTTP_URL?.replace(/\/$/, "") ?? "http://localhost:8001";
  const startedAt = Date.now();
  try {
    const response = await fetch(`${httpUrl}/health`, {
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
      headers: process.env.TRANSCRIPTION_API_KEY
        ? { Authorization: `Bearer ${process.env.TRANSCRIPTION_API_KEY}` }
        : undefined,
    });
    return {
      online: response.ok,
      provider: providerSettings?.provider ?? process.env.TRANSCRIPTION_REALTIME_PROVIDER ?? "speaches",
      model:
        providerSettings?.model ??
        process.env.TRANSCRIPTION_DEFAULT_MODEL ??
        "deepdml/faster-whisper-large-v3-turbo-ct2",
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return {
      online: false,
      provider: providerSettings?.provider ?? process.env.TRANSCRIPTION_REALTIME_PROVIDER ?? "speaches",
      model:
        providerSettings?.model ??
        process.env.TRANSCRIPTION_DEFAULT_MODEL ??
        "deepdml/faster-whisper-large-v3-turbo-ct2",
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    };
  }
}

type TranscriptionTokenPayload = {
  v: 1;
  iss: string;
  aud: string;
  sub: string;
  tenantId: string;
  appointmentId: string;
  transcriptId: string;
  participantId: string;
  jti: string;
  iat: number;
  nbf: number;
  exp: number;
  scope: ["transcription:stream"];
  model?: string;
  language?: string;
  origin?: string;
};

function tokenSecret() {
  const secret = process.env.TRANSCRIPTION_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new TranscriptionDomainError(
      "TOKEN_NOT_CONFIGURED",
      "Token efêmero de transcrição não configurado."
    );
  }
  return secret;
}

export async function createTranscriptionSessionToken(
  tenantId: string,
  transcriptId: string,
  participantId: string
) {
  const transcript = await getOwnedTranscript(tenantId, transcriptId);
  await assertSessionWithinLimit(tenantId, transcript);
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: TranscriptionTokenPayload = {
    v: 1,
    iss: process.env.TRANSCRIPTION_TOKEN_ISSUER ?? "nutriopus",
    aud: process.env.TRANSCRIPTION_TOKEN_AUDIENCE ?? "transcription-gateway",
    sub: transcriptId,
    tenantId,
    appointmentId: transcript.appointmentId ?? transcript.careSessionId ?? transcriptId,
    transcriptId,
    participantId,
    jti: randomUUID(),
    iat: issuedAt,
    nbf: issuedAt,
    exp: issuedAt + 120,
    scope: ["transcription:stream"],
    model: transcript.model ?? undefined,
    language: transcript.language,
    origin: process.env.NEXT_PUBLIC_APP_URL,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", tokenSecret()).update(encoded).digest("base64url");
  const token = `${encoded}.${signature}`;
  const url = new URL(publicWebsocketUrl());
  url.searchParams.set("model", transcript.model ?? "");
  url.searchParams.set("language", transcript.language);
  url.searchParams.set("intent", "transcription");
  return {
    token,
    websocketUrl: url.toString(),
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    provider: transcript.provider,
    model: transcript.model,
    language: transcript.language,
    sampleRate: transcript.sampleRate,
    chunkMs: transcript.chunkMs,
  };
}

export function verifyTranscriptionSessionToken(token: string) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", tokenSecret()).update(encoded).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  const payload = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8")
  ) as TranscriptionTokenPayload;
  if (
    payload.v !== 1 ||
    payload.iss !== (process.env.TRANSCRIPTION_TOKEN_ISSUER ?? "nutriopus") ||
    payload.aud !==
      (process.env.TRANSCRIPTION_TOKEN_AUDIENCE ?? "transcription-gateway") ||
    payload.exp <= Math.floor(Date.now() / 1000) ||
    !payload.scope.includes("transcription:stream")
  ) return null;
  return payload;
}

export async function getGlobalTranscriptionMetrics() {
  const month = yearMonth();
  const [settingsCount, usage, topTenants] = await Promise.all([
    prisma.transcriptionSettings.count({ where: { enabled: true } }),
    prisma.transcriptionUsageCounter.aggregate({
      where: { yearMonth: month },
      _sum: {
        sessionsStarted: true,
        sessionsCompleted: true,
        sessionsFailed: true,
        minutesTranscribed: true,
        providerErrors: true,
        latencyTotalMs: true,
        latencySamples: true,
      },
    }),
    prisma.transcriptionUsageCounter.groupBy({
      by: ["tenantId"],
      where: { yearMonth: month },
      _sum: { minutesTranscribed: true, providerErrors: true },
      orderBy: { _sum: { minutesTranscribed: "desc" } },
      take: 10,
    }),
  ]);
  const totals = usage._sum;
  return {
    month,
    activeTenants: settingsCount,
    sessionsStarted: totals.sessionsStarted ?? 0,
    sessionsCompleted: totals.sessionsCompleted ?? 0,
    sessionsFailed: totals.sessionsFailed ?? 0,
    minutesTranscribed: totals.minutesTranscribed ?? 0,
    providerErrors: totals.providerErrors ?? 0,
    averageLatencyMs:
      (totals.latencySamples ?? 0) > 0
        ? Math.round((totals.latencyTotalMs ?? 0) / (totals.latencySamples ?? 1))
        : null,
    topTenants: topTenants.map((item) => ({
      tenantId: item.tenantId,
      minutesTranscribed: item._sum.minutesTranscribed ?? 0,
      providerErrors: item._sum.providerErrors ?? 0,
    })),
  };
}
