-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('WEIGHT_LOSS', 'WEIGHT_GAIN', 'MAINTAIN_WEIGHT', 'REDUCE_BODY_FAT', 'INCREASE_LEAN_MASS', 'IMPROVE_EATING_HABITS', 'CUSTOM');
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'ABANDONED');
CREATE TYPE "ReminderFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "patient_goals" (
    "id" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "GoalType" NOT NULL DEFAULT 'CUSTOM',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetValue" DOUBLE PRECISION,
    "targetUnit" TEXT,
    "initialValue" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetDate" TIMESTAMP(3),
    "achievedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_check_ins" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "note" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_reminders" (
    "id" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "frequency" "ReminderFrequency" NOT NULL DEFAULT 'DAILY',
    "nextSendAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_goals_nutritionistId_idx" ON "patient_goals"("nutritionistId");
CREATE INDEX "patient_goals_patientId_idx" ON "patient_goals"("patientId");
CREATE INDEX "patient_goals_status_idx" ON "patient_goals"("status");
CREATE INDEX "goal_check_ins_goalId_idx" ON "goal_check_ins"("goalId");
CREATE INDEX "patient_reminders_nutritionistId_idx" ON "patient_reminders"("nutritionistId");
CREATE INDEX "patient_reminders_patientId_idx" ON "patient_reminders"("patientId");
CREATE INDEX "patient_reminders_nextSendAt_idx" ON "patient_reminders"("nextSendAt");

-- AddForeignKey
ALTER TABLE "patient_goals" ADD CONSTRAINT "patient_goals_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_goals" ADD CONSTRAINT "patient_goals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goal_check_ins" ADD CONSTRAINT "goal_check_ins_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "patient_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_reminders" ADD CONSTRAINT "patient_reminders_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_reminders" ADD CONSTRAINT "patient_reminders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
