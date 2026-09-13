CREATE TYPE "TranscriptSpeakerSource" AS ENUM (
  'NUTRITIONIST',
  'PATIENT',
  'TEAM_MEMBER',
  'IN_PERSON_ROOM',
  'UNKNOWN'
);

CREATE TABLE "transcription_settings" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "autoStartOnlineAppointments" BOOLEAN NOT NULL DEFAULT true,
  "autoStartInPersonAppointments" BOOLEAN NOT NULL DEFAULT true,
  "requirePatientNotice" BOOLEAN NOT NULL DEFAULT true,
  "requireInPersonConfirmation" BOOLEAN NOT NULL DEFAULT true,
  "saveTranscriptByDefault" BOOLEAN NOT NULL DEFAULT true,
  "attachToMedicalRecordByDefault" BOOLEAN NOT NULL DEFAULT false,
  "provider" TEXT NOT NULL DEFAULT 'speaches',
  "model" TEXT NOT NULL DEFAULT 'deepdml/faster-whisper-large-v3-turbo-ct2',
  "fallbackModel" TEXT NOT NULL DEFAULT 'Systran/faster-whisper-small',
  "language" TEXT NOT NULL DEFAULT 'pt',
  "sampleRate" INTEGER NOT NULL DEFAULT 16000,
  "chunkMs" INTEGER NOT NULL DEFAULT 1000,
  "saveAudio" BOOLEAN NOT NULL DEFAULT false,
  "maxSessionMinutes" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "transcription_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "appointment_transcripts" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "careSessionId" TEXT,
  "patientId" TEXT NOT NULL,
  "status" "TranscriptStatus" NOT NULL DEFAULT 'LIVE',
  "provider" TEXT NOT NULL,
  "model" TEXT,
  "language" TEXT NOT NULL DEFAULT 'pt',
  "sampleRate" INTEGER,
  "chunkMs" INTEGER,
  "autoStarted" BOOLEAN NOT NULL DEFAULT false,
  "onlineMode" BOOLEAN NOT NULL DEFAULT false,
  "inPersonMode" BOOLEAN NOT NULL DEFAULT false,
  "saveAudio" BOOLEAN NOT NULL DEFAULT false,
  "noticeConfirmedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "savedAt" TIMESTAMP(3),
  "savedByUserId" TEXT,
  "discardedAt" TIMESTAMP(3),
  "attachedNoteId" TEXT,
  "segmentCount" INTEGER NOT NULL DEFAULT 0,
  "durationSeconds" INTEGER,
  "providerLatencyMs" INTEGER,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "lastErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "appointment_transcripts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "appointment_transcript_segments" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "transcriptId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "careSessionId" TEXT,
  "segmentKey" TEXT NOT NULL,
  "participantId" TEXT,
  "speakerUserId" TEXT,
  "speakerPatientId" TEXT,
  "speakerNameSnapshot" TEXT,
  "speakerRoleSnapshot" TEXT,
  "source" "TranscriptSpeakerSource" NOT NULL DEFAULT 'UNKNOWN',
  "text" TEXT NOT NULL,
  "isFinal" BOOLEAN NOT NULL DEFAULT true,
  "confidence" DOUBLE PRECISION,
  "startedAtMs" INTEGER,
  "endedAtMs" INTEGER,
  "clientTimestamp" TIMESTAMP(3),
  "providerTimestamp" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "appointment_transcript_segments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "appointment_transcript_participants" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "transcriptId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "speakerUserId" TEXT,
  "speakerPatientId" TEXT,
  "speakerNameSnapshot" TEXT,
  "source" "TranscriptSpeakerSource" NOT NULL DEFAULT 'UNKNOWN',
  "noticeAcknowledgedAt" TIMESTAMP(3),
  "consentDeclinedAt" TIMESTAMP(3),
  "audioState" TEXT NOT NULL DEFAULT 'idle',
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "appointment_transcript_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transcription_usage_counters" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "yearMonth" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL DEFAULT '',
  "sessionsStarted" INTEGER NOT NULL DEFAULT 0,
  "sessionsCompleted" INTEGER NOT NULL DEFAULT 0,
  "sessionsFailed" INTEGER NOT NULL DEFAULT 0,
  "minutesTranscribed" INTEGER NOT NULL DEFAULT 0,
  "segmentsCreated" INTEGER NOT NULL DEFAULT 0,
  "providerErrors" INTEGER NOT NULL DEFAULT 0,
  "latencyTotalMs" INTEGER NOT NULL DEFAULT 0,
  "latencySamples" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "transcription_usage_counters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "transcription_settings_tenantId_key"
  ON "transcription_settings"("tenantId");
CREATE INDEX "appointment_transcripts_tenantId_appointmentId_idx"
  ON "appointment_transcripts"("tenantId", "appointmentId");
CREATE INDEX "appointment_transcripts_tenantId_careSessionId_idx"
  ON "appointment_transcripts"("tenantId", "careSessionId");
CREATE INDEX "appointment_transcripts_tenantId_patientId_createdAt_idx"
  ON "appointment_transcripts"("tenantId", "patientId", "createdAt");
CREATE INDEX "appointment_transcripts_tenantId_status_idx"
  ON "appointment_transcripts"("tenantId", "status");
CREATE UNIQUE INDEX "appointment_transcript_segments_transcriptId_segmentKey_key"
  ON "appointment_transcript_segments"("transcriptId", "segmentKey");
CREATE INDEX "appointment_transcript_segments_tenantId_transcriptId_createdAt_idx"
  ON "appointment_transcript_segments"("tenantId", "transcriptId", "createdAt");
CREATE INDEX "appointment_transcript_segments_tenantId_appointmentId_createdAt_idx"
  ON "appointment_transcript_segments"("tenantId", "appointmentId", "createdAt");
CREATE INDEX "appointment_transcript_segments_tenantId_careSessionId_createdAt_idx"
  ON "appointment_transcript_segments"("tenantId", "careSessionId", "createdAt");
CREATE INDEX "appointment_transcript_segments_tenantId_source_createdAt_idx"
  ON "appointment_transcript_segments"("tenantId", "source", "createdAt");
CREATE UNIQUE INDEX "appointment_transcript_participants_transcriptId_participantId_key"
  ON "appointment_transcript_participants"("transcriptId", "participantId");
CREATE INDEX "appointment_transcript_participants_tenantId_transcriptId_idx"
  ON "appointment_transcript_participants"("tenantId", "transcriptId");
CREATE UNIQUE INDEX "transcription_usage_counters_tenantId_yearMonth_provider_model_key"
  ON "transcription_usage_counters"("tenantId", "yearMonth", "provider", "model");
CREATE INDEX "transcription_usage_counters_tenantId_yearMonth_idx"
  ON "transcription_usage_counters"("tenantId", "yearMonth");

ALTER TABLE "transcription_settings"
  ADD CONSTRAINT "transcription_settings_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "nutritionists"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointment_transcripts"
  ADD CONSTRAINT "appointment_transcripts_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "nutritionists"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointment_transcripts"
  ADD CONSTRAINT "appointment_transcripts_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "appointment_transcripts"
  ADD CONSTRAINT "appointment_transcripts_careSessionId_fkey"
  FOREIGN KEY ("careSessionId") REFERENCES "care_sessions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "appointment_transcripts"
  ADD CONSTRAINT "appointment_transcripts_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointment_transcripts"
  ADD CONSTRAINT "appointment_transcripts_savedByUserId_fkey"
  FOREIGN KEY ("savedByUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "appointment_transcript_segments"
  ADD CONSTRAINT "appointment_transcript_segments_transcriptId_fkey"
  FOREIGN KEY ("transcriptId") REFERENCES "appointment_transcripts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointment_transcript_participants"
  ADD CONSTRAINT "appointment_transcript_participants_transcriptId_fkey"
  FOREIGN KEY ("transcriptId") REFERENCES "appointment_transcripts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transcription_usage_counters"
  ADD CONSTRAINT "transcription_usage_counters_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "nutritionists"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
