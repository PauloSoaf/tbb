-- CreateEnum
CREATE TYPE "CareSessionStatus" AS ENUM ('SCHEDULED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "CareSessionMode" AS ENUM ('VIDEO', 'AUDIO', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "CareSessionActor" AS ENUM ('NUTRITIONIST', 'PATIENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TranscriptStatus" AS ENUM ('NOT_STARTED', 'RECORDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "care_sessions" (
    "id" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "title" TEXT,
    "status" "CareSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "mode" "CareSessionMode" NOT NULL DEFAULT 'VIDEO',
    "roomProvider" TEXT,
    "roomId" TEXT,
    "roomUrl" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "patientJoinedAt" TIMESTAMP(3),
    "nutritionistJoinedAt" TIMESTAMP(3),
    "notes" TEXT,
    "clinicalSummary" TEXT,
    "patientInstructions" TEXT,
    "transcriptText" TEXT,
    "transcriptStatus" "TranscriptStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "consentForRecording" BOOLEAN NOT NULL DEFAULT false,
    "consentForTranscription" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_session_messages" (
    "id" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "careSessionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "sender" "CareSessionActor" NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_session_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_session_attachments" (
    "id" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "careSessionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedBy" "CareSessionActor" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_session_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "care_sessions_nutritionistId_idx" ON "care_sessions"("nutritionistId");
CREATE INDEX "care_sessions_patientId_idx" ON "care_sessions"("patientId");
CREATE INDEX "care_sessions_appointmentId_idx" ON "care_sessions"("appointmentId");
CREATE INDEX "care_sessions_status_idx" ON "care_sessions"("status");
CREATE INDEX "care_sessions_startedAt_idx" ON "care_sessions"("startedAt");

CREATE INDEX "care_session_messages_nutritionistId_idx" ON "care_session_messages"("nutritionistId");
CREATE INDEX "care_session_messages_careSessionId_idx" ON "care_session_messages"("careSessionId");
CREATE INDEX "care_session_messages_patientId_idx" ON "care_session_messages"("patientId");
CREATE INDEX "care_session_messages_createdAt_idx" ON "care_session_messages"("createdAt");

CREATE INDEX "care_session_attachments_nutritionistId_idx" ON "care_session_attachments"("nutritionistId");
CREATE INDEX "care_session_attachments_careSessionId_idx" ON "care_session_attachments"("careSessionId");
CREATE INDEX "care_session_attachments_patientId_idx" ON "care_session_attachments"("patientId");

-- AddForeignKey
ALTER TABLE "care_sessions" ADD CONSTRAINT "care_sessions_nutritionistId_fkey"
    FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "care_sessions" ADD CONSTRAINT "care_sessions_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "care_sessions" ADD CONSTRAINT "care_sessions_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "care_session_messages" ADD CONSTRAINT "care_session_messages_careSessionId_fkey"
    FOREIGN KEY ("careSessionId") REFERENCES "care_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "care_session_messages" ADD CONSTRAINT "care_session_messages_nutritionistId_fkey"
    FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "care_session_messages" ADD CONSTRAINT "care_session_messages_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "care_session_attachments" ADD CONSTRAINT "care_session_attachments_careSessionId_fkey"
    FOREIGN KEY ("careSessionId") REFERENCES "care_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "care_session_attachments" ADD CONSTRAINT "care_session_attachments_nutritionistId_fkey"
    FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "care_session_attachments" ADD CONSTRAINT "care_session_attachments_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
