-- Sprint Clínica: Oficina de Planos Avançada e Avaliação Antropométrica Profissional
-- All additions are nullable/defaulted to preserve existing meal plans and
-- assessment history without a backfill.

ALTER TABLE "meal_plans"
  ADD COLUMN "pdfStyle" JSONB;

ALTER TABLE "meals"
  ADD COLUMN "imageAlt" TEXT,
  ADD COLUMN "imageCaption" TEXT,
  ADD COLUMN "showImageInPdf" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "meal_items"
  ADD COLUMN "householdMeasureSource" TEXT,
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "imageAlt" TEXT,
  ADD COLUMN "imageCaption" TEXT,
  ADD COLUMN "showImageInPdf" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "patient_measurements"
  ADD COLUMN "waistHeightRatio" DOUBLE PRECISION,
  ADD COLUMN "waistHipRisk" TEXT,
  ADD COLUMN "waistHeightRisk" TEXT,
  ADD COLUMN "assessmentProfile" TEXT,
  ADD COLUMN "assessmentAge" INTEGER,
  ADD COLUMN "biologicalSex" TEXT,
  ADD COLUMN "skinfoldProtocol" TEXT,
  ADD COLUMN "skinfoldMeasurements" JSONB,
  ADD COLUMN "skinfoldSum" DOUBLE PRECISION,
  ADD COLUMN "skinfoldBodyDensity" DOUBLE PRECISION,
  ADD COLUMN "skinfoldFormula" TEXT;

CREATE INDEX "patient_measurements_nutritionistId_patientId_idx"
  ON "patient_measurements"("nutritionistId", "patientId");
