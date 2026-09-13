-- CreateEnum
CREATE TYPE "FoodDiaryMeal" AS ENUM ('BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'SUPPER', 'OTHER');

-- CreateEnum
CREATE TYPE "ChatMessageSender" AS ENUM ('PATIENT', 'NUTRITIONIST');

-- CreateEnum
CREATE TYPE "PatientAccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'BLOCKED');

-- AlterTable: add visibleToPatient to documents
ALTER TABLE "documents" ADD COLUMN "visibleToPatient" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: patient_accounts
CREATE TABLE "patient_accounts" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "PatientAccountStatus" NOT NULL DEFAULT 'PENDING',
    "activationToken" TEXT,
    "activationTokenExpiresAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: food_diary_entries
CREATE TABLE "food_diary_entries" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "meal" "FoodDiaryMeal" NOT NULL DEFAULT 'OTHER',
    "foodName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "calories" DOUBLE PRECISION,
    "protein" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "hunger" INTEGER,
    "satiety" INTEGER,
    "mood" TEXT,
    "notes" TEXT,
    "imageUrl" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_diary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable: chat_messages
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "sender" "ChatMessageSender" NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_accounts_patientId_key" ON "patient_accounts"("patientId");
CREATE UNIQUE INDEX "patient_accounts_activationToken_key" ON "patient_accounts"("activationToken");
CREATE INDEX "patient_accounts_nutritionistId_idx" ON "patient_accounts"("nutritionistId");
CREATE INDEX "patient_accounts_email_idx" ON "patient_accounts"("email");

CREATE INDEX "food_diary_entries_patientId_idx" ON "food_diary_entries"("patientId");
CREATE INDEX "food_diary_entries_nutritionistId_idx" ON "food_diary_entries"("nutritionistId");
CREATE INDEX "food_diary_entries_loggedAt_idx" ON "food_diary_entries"("loggedAt");

CREATE INDEX "chat_messages_patientId_idx" ON "chat_messages"("patientId");
CREATE INDEX "chat_messages_nutritionistId_idx" ON "chat_messages"("nutritionistId");
CREATE INDEX "chat_messages_createdAt_idx" ON "chat_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "patient_accounts" ADD CONSTRAINT "patient_accounts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_accounts" ADD CONSTRAINT "patient_accounts_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "food_diary_entries" ADD CONSTRAINT "food_diary_entries_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "food_diary_entries" ADD CONSTRAINT "food_diary_entries_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
