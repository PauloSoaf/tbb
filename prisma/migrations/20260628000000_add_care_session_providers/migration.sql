-- CreateEnum
CREATE TYPE "CareSessionProvider" AS ENUM ('NATIVE_WEBRTC', 'GOOGLE_MEET', 'JITSI_LEGACY', 'EXTERNAL_LINK');

-- CreateEnum
CREATE TYPE "CareSessionJoinRole" AS ENUM ('NUTRITIONIST', 'PATIENT');

-- AlterTable
ALTER TABLE "care_sessions" ADD COLUMN "provider" "CareSessionProvider" NOT NULL DEFAULT 'JITSI_LEGACY';
ALTER TABLE "care_sessions" ADD COLUMN "externalMeetingUrl" TEXT;
ALTER TABLE "care_sessions" ADD COLUMN "googleMeetSpaceName" TEXT;
ALTER TABLE "care_sessions" ADD COLUMN "googleMeetUri" TEXT;
ALTER TABLE "care_sessions" ADD COLUMN "googleMeetMeetingCode" TEXT;
ALTER TABLE "care_sessions" ADD COLUMN "nativeRoomName" TEXT;
ALTER TABLE "care_sessions" ADD COLUMN "nativeSignalChannel" TEXT;

-- CreateIndex
CREATE INDEX "care_sessions_provider_idx" ON "care_sessions"("provider");

-- CreateTable
CREATE TABLE "care_session_signals" (
    "id" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "careSessionId" TEXT NOT NULL,
    "senderRole" "CareSessionJoinRole" NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_session_signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "care_session_signals_nutritionistId_idx" ON "care_session_signals"("nutritionistId");

-- CreateIndex
CREATE INDEX "care_session_signals_careSessionId_idx" ON "care_session_signals"("careSessionId");

-- CreateIndex
CREATE INDEX "care_session_signals_createdAt_idx" ON "care_session_signals"("createdAt");
