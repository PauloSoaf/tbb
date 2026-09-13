-- CreateEnum
CREATE TYPE "SkinfoldProtocol" AS ENUM (
  'POLLOCK_3_MALE',
  'POLLOCK_3_FEMALE',
  'POLLOCK_7',
  'GUEDES',
  'PETROSKI_MALE',
  'PETROSKI_FEMALE',
  'DURNIN_WOMERSLEY'
);

-- CreateTable
CREATE TABLE "skinfold_assessments" (
    "id" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "protocol" "SkinfoldProtocol" NOT NULL,
    "age" INTEGER NOT NULL,
    "sex" TEXT NOT NULL,
    "chest" DOUBLE PRECISION,
    "axillary" DOUBLE PRECISION,
    "triceps" DOUBLE PRECISION,
    "subscapular" DOUBLE PRECISION,
    "abdominal" DOUBLE PRECISION,
    "suprailiac" DOUBLE PRECISION,
    "thigh" DOUBLE PRECISION,
    "medialCalf" DOUBLE PRECISION,
    "bodyDensity" DOUBLE PRECISION,
    "bodyFatPct" DOUBLE PRECISION,
    "bodyFatKg" DOUBLE PRECISION,
    "leanMassKg" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "notes" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skinfold_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "skinfold_assessments_nutritionistId_idx" ON "skinfold_assessments"("nutritionistId");
CREATE INDEX "skinfold_assessments_patientId_idx" ON "skinfold_assessments"("patientId");
CREATE INDEX "skinfold_assessments_assessedAt_idx" ON "skinfold_assessments"("assessedAt");

-- AddForeignKey
ALTER TABLE "skinfold_assessments" ADD CONSTRAINT "skinfold_assessments_nutritionistId_fkey"
  FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "skinfold_assessments" ADD CONSTRAINT "skinfold_assessments_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
