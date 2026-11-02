-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApplicationStatus" ADD VALUE 'WANT_TO_APPLY';
ALTER TYPE "ApplicationStatus" ADD VALUE 'IN_REVIEW';
ALTER TYPE "ApplicationStatus" ADD VALUE 'TECHNICAL_TEST';
ALTER TYPE "ApplicationStatus" ADD VALUE 'ARCHIVED';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "careersUrl" TEXT,
ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "trackingStatus" TEXT NOT NULL DEFAULT 'WATCHING';

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "coverLetter" TEXT,
ADD COLUMN     "deadline" TEXT,
ADD COLUMN     "foundOn" TEXT,
ADD COLUMN     "lastContactOn" TEXT,
ADD COLUMN     "nextAction" TEXT,
ADD COLUMN     "requirements" TEXT,
ADD COLUMN     "response" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "resumeVersionId" TEXT,
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "seniority" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "meetingUrl" TEXT,
ADD COLUMN     "preparation" TEXT,
ADD COLUMN     "preparationDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ProfessionalProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stack" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'pt',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "template" TEXT NOT NULL DEFAULT 'CLASSIC',
    "spacing" TEXT NOT NULL DEFAULT 'NORMAL',
    "content" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeVersion" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "settings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewStory" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'STAR',
    "content" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewAnswer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "storyId" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 1,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeSession" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetMinutes" INTEGER NOT NULL DEFAULT 45,
    "status" TEXT NOT NULL DEFAULT 'PAUSED',
    "totalSeconds" INTEGER NOT NULL DEFAULT 0,
    "activeSince" TIMESTAMP(3),
    "activeQuestionId" TEXT,
    "answers" JSONB NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "applicationId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'REMINDER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "meetingUrl" TEXT,
    "notes" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerGoal" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "manualProgress" INTEGER NOT NULL DEFAULT 0,
    "startsOn" TEXT NOT NULL,
    "endsOn" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerLink" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'JOB_BOARD',
    "stack" TEXT NOT NULL DEFAULT '',
    "notes" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerView" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_workspaceId_key" ON "ProfessionalProfile"("workspaceId");

-- CreateIndex
CREATE INDEX "ResumeProfile_workspaceId_updatedAt_idx" ON "ResumeProfile"("workspaceId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeProfile_id_workspaceId_key" ON "ResumeProfile"("id", "workspaceId");

-- CreateIndex
CREATE INDEX "ResumeVersion_workspaceId_resumeId_idx" ON "ResumeVersion"("workspaceId", "resumeId");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeVersion_id_workspaceId_key" ON "ResumeVersion"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeVersion_resumeId_number_key" ON "ResumeVersion"("resumeId", "number");

-- CreateIndex
CREATE INDEX "InterviewStory_workspaceId_idx" ON "InterviewStory"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewStory_id_workspaceId_key" ON "InterviewStory"("id", "workspaceId");

-- CreateIndex
CREATE INDEX "InterviewAnswer_workspaceId_category_idx" ON "InterviewAnswer"("workspaceId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewAnswer_id_workspaceId_key" ON "InterviewAnswer"("id", "workspaceId");

-- CreateIndex
CREATE INDEX "PracticeSession_workspaceId_userId_startedAt_idx" ON "PracticeSession"("workspaceId", "userId", "startedAt");

-- CreateIndex
CREATE INDEX "CareerEvent_workspaceId_scheduledAt_idx" ON "CareerEvent"("workspaceId", "scheduledAt");

-- CreateIndex
CREATE INDEX "CareerGoal_workspaceId_endsOn_idx" ON "CareerGoal"("workspaceId", "endsOn");

-- CreateIndex
CREATE INDEX "CareerLink_workspaceId_type_idx" ON "CareerLink"("workspaceId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "CareerView_workspaceId_userId_title_key" ON "CareerView"("workspaceId", "userId", "title");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_resumeVersionId_workspaceId_fkey" FOREIGN KEY ("resumeVersionId", "workspaceId") REFERENCES "ResumeVersion"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeProfile" ADD CONSTRAINT "ResumeProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_resumeId_workspaceId_fkey" FOREIGN KEY ("resumeId", "workspaceId") REFERENCES "ResumeProfile"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewStory" ADD CONSTRAINT "InterviewStory_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAnswer" ADD CONSTRAINT "InterviewAnswer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAnswer" ADD CONSTRAINT "InterviewAnswer_storyId_workspaceId_fkey" FOREIGN KEY ("storyId", "workspaceId") REFERENCES "InterviewStory"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerEvent" ADD CONSTRAINT "CareerEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerEvent" ADD CONSTRAINT "CareerEvent_applicationId_workspaceId_fkey" FOREIGN KEY ("applicationId", "workspaceId") REFERENCES "Application"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerGoal" ADD CONSTRAINT "CareerGoal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerLink" ADD CONSTRAINT "CareerLink_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerView" ADD CONSTRAINT "CareerView_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
