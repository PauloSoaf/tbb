-- Add meal substitutions and equivalent foods.

CREATE TYPE "SubstitutionGroupType" AS ENUM ('ITEM_REPLACEMENT', 'MEAL_OPTION');
CREATE TYPE "EquivalenceBasis" AS ENUM ('CALORIES', 'MACROS', 'CARBS', 'PROTEIN', 'FAT', 'PORTION', 'FOOD_GROUP', 'MANUAL');
CREATE TYPE "SubstitutionItemSource" AS ENUM ('TACO', 'CUSTOM');

CREATE TABLE "meal_substitution_groups" (
  "id" TEXT NOT NULL,
  "nutritionistId" TEXT NOT NULL,
  "mealPlanId" TEXT NOT NULL,
  "mealId" TEXT,
  "baseMealItemId" TEXT,
  "type" "SubstitutionGroupType" NOT NULL DEFAULT 'ITEM_REPLACEMENT',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "equivalenceBasis" "EquivalenceBasis" NOT NULL DEFAULT 'MANUAL',
  "targetCalories" DOUBLE PRECISION,
  "targetProtein" DOUBLE PRECISION,
  "targetCarbs" DOUBLE PRECISION,
  "targetFat" DOUBLE PRECISION,
  "targetQuantity" DOUBLE PRECISION,
  "targetUnit" TEXT,
  "visibleToPatient" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "meal_substitution_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meal_substitution_items" (
  "id" TEXT NOT NULL,
  "nutritionistId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "foodName" TEXT NOT NULL,
  "source" "SubstitutionItemSource" NOT NULL DEFAULT 'CUSTOM',
  "tacoFoodId" TEXT,
  "quantity" DOUBLE PRECISION,
  "unit" TEXT,
  "householdMeasure" TEXT,
  "calories" DOUBLE PRECISION,
  "protein" DOUBLE PRECISION,
  "carbs" DOUBLE PRECISION,
  "fat" DOUBLE PRECISION,
  "fiber" DOUBLE PRECISION,
  "sodium" DOUBLE PRECISION,
  "equivalenceNotes" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "meal_substitution_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "meal_substitution_groups_nutritionistId_idx" ON "meal_substitution_groups"("nutritionistId");
CREATE INDEX "meal_substitution_groups_mealPlanId_idx" ON "meal_substitution_groups"("mealPlanId");
CREATE INDEX "meal_substitution_groups_mealId_idx" ON "meal_substitution_groups"("mealId");
CREATE INDEX "meal_substitution_groups_baseMealItemId_idx" ON "meal_substitution_groups"("baseMealItemId");
CREATE INDEX "meal_substitution_groups_visibleToPatient_idx" ON "meal_substitution_groups"("visibleToPatient");

CREATE INDEX "meal_substitution_items_nutritionistId_idx" ON "meal_substitution_items"("nutritionistId");
CREATE INDEX "meal_substitution_items_groupId_idx" ON "meal_substitution_items"("groupId");
CREATE INDEX "meal_substitution_items_position_idx" ON "meal_substitution_items"("position");

ALTER TABLE "meal_substitution_groups"
  ADD CONSTRAINT "meal_substitution_groups_nutritionistId_fkey"
  FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meal_substitution_groups"
  ADD CONSTRAINT "meal_substitution_groups_mealPlanId_fkey"
  FOREIGN KEY ("mealPlanId") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meal_substitution_groups"
  ADD CONSTRAINT "meal_substitution_groups_mealId_fkey"
  FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meal_substitution_groups"
  ADD CONSTRAINT "meal_substitution_groups_baseMealItemId_fkey"
  FOREIGN KEY ("baseMealItemId") REFERENCES "meal_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "meal_substitution_items"
  ADD CONSTRAINT "meal_substitution_items_nutritionistId_fkey"
  FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meal_substitution_items"
  ADD CONSTRAINT "meal_substitution_items_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "meal_substitution_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
