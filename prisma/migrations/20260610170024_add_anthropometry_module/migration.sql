/*
  Warnings:

  - You are about to drop the column `bodyFat` on the `patient_measurements` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "MeasurementSource" AS ENUM ('MANUAL', 'BIOIMPEDANCE', 'SKINFOLD', 'PHOTO_ESTIMATION');

-- DropForeignKey
ALTER TABLE "patient_measurements" DROP CONSTRAINT "patient_measurements_nutritionistId_fkey";

-- DropForeignKey
ALTER TABLE "patient_measurements" DROP CONSTRAINT "patient_measurements_patientId_fkey";

-- AlterTable
ALTER TABLE "patient_measurements" DROP COLUMN "bodyFat",
ADD COLUMN     "abdomen" DOUBLE PRECISION,
ADD COLUMN     "bmiClassification" TEXT,
ADD COLUMN     "bodyFatKg" DOUBLE PRECISION,
ADD COLUMN     "bodyFatPercentage" DOUBLE PRECISION,
ADD COLUMN     "calf" DOUBLE PRECISION,
ADD COLUMN     "chest" DOUBLE PRECISION,
ADD COLUMN     "contractedArm" DOUBLE PRECISION,
ADD COLUMN     "forearm" DOUBLE PRECISION,
ADD COLUMN     "leanMassKg" DOUBLE PRECISION,
ADD COLUMN     "neck" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "relaxedArm" DOUBLE PRECISION,
ADD COLUMN     "source" "MeasurementSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "thigh" DOUBLE PRECISION,
ADD COLUMN     "waistHipRatio" DOUBLE PRECISION,
ALTER COLUMN "measuredAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "patient_measurements_nutritionistId_idx" ON "patient_measurements"("nutritionistId");

-- CreateIndex
CREATE INDEX "patient_measurements_patientId_idx" ON "patient_measurements"("patientId");

-- CreateIndex
CREATE INDEX "patient_measurements_measuredAt_idx" ON "patient_measurements"("measuredAt");

-- AddForeignKey
ALTER TABLE "patient_measurements" ADD CONSTRAINT "patient_measurements_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_measurements" ADD CONSTRAINT "patient_measurements_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
