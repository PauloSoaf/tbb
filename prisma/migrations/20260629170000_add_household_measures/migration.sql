CREATE TYPE "HouseholdMeasureType" AS ENUM ('SPOON', 'CUP', 'GLASS', 'LADLE', 'PLATE', 'SLICE', 'UNIT', 'PIECE', 'SCOOP', 'PORTION', 'CUSTOM');
CREATE TYPE "HouseholdMeasureSize" AS ENUM ('TEA_SPOON', 'DESSERT_SPOON', 'TABLE_SPOON', 'SERVING_SPOON', 'COFFEE_CUP', 'TEA_CUP', 'AMERICAN_GLASS', 'COMMON_GLASS', 'SMALL', 'MEDIUM', 'LARGE', 'CUSTOM');
CREATE TYPE "HouseholdMeasureSource" AS ENUM ('TBCA', 'TACO', 'USDA_FDC', 'ANVISA', 'PINHEIRO', 'PACHECO', 'MANUAL', 'CURATED', 'NUTRITIONIST_CUSTOM');
CREATE TYPE "HouseholdMeasureConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "household_measures" (
    "id" TEXT NOT NULL,
    "type" "HouseholdMeasureType" NOT NULL,
    "size" "HouseholdMeasureSize" NOT NULL,
    "namePt" TEXT NOT NULL,
    "nameEn" TEXT,
    "nameEs" TEXT,
    "abbreviationPt" TEXT,
    "abbreviationEn" TEXT,
    "abbreviationEs" TEXT,
    "defaultVolumeMl" DOUBLE PRECISION,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_measures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "food_household_measures" (
    "id" TEXT NOT NULL,
    "tacoFoodId" TEXT,
    "tacoFoodName" TEXT,
    "normalizedFoodName" TEXT NOT NULL,
    "householdMeasureId" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "minGrams" DOUBLE PRECISION,
    "maxGrams" DOUBLE PRECISION,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "labelPt" TEXT,
    "labelEn" TEXT,
    "labelEs" TEXT,
    "source" "HouseholdMeasureSource" NOT NULL DEFAULT 'CURATED',
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "sourceNotes" TEXT,
    "confidence" "HouseholdMeasureConfidence" NOT NULL DEFAULT 'MEDIUM',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdByNutritionistId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_household_measures_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "household_measures_type_idx" ON "household_measures"("type");
CREATE INDEX "household_measures_size_idx" ON "household_measures"("size");
CREATE INDEX "food_household_measures_tacoFoodId_idx" ON "food_household_measures"("tacoFoodId");
CREATE INDEX "food_household_measures_normalizedFoodName_idx" ON "food_household_measures"("normalizedFoodName");
CREATE INDEX "food_household_measures_householdMeasureId_idx" ON "food_household_measures"("householdMeasureId");
CREATE INDEX "food_household_measures_source_idx" ON "food_household_measures"("source");
CREATE INDEX "food_household_measures_createdByNutritionistId_idx" ON "food_household_measures"("createdByNutritionistId");

ALTER TABLE "food_household_measures" ADD CONSTRAINT "food_household_measures_householdMeasureId_fkey" FOREIGN KEY ("householdMeasureId") REFERENCES "household_measures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "food_household_measures" ADD CONSTRAINT "food_household_measures_createdByNutritionistId_fkey" FOREIGN KEY ("createdByNutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
