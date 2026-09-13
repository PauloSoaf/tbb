-- Oficina de Planos: biblioteca reutilizável por nutricionista.
-- Refeições salvas usam snapshots próprios de alimentos para não dependerem
-- dos registros clínicos de pacientes nem mudarem retroativamente.

CREATE TABLE "meal_plan_library_foods" (
  "id" TEXT NOT NULL,
  "nutritionistId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "source" "MealItemSource" NOT NULL DEFAULT 'CUSTOM',
  "tacoFoodId" TEXT,
  "defaultQuantity" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "householdMeasure" TEXT,
  "householdMeasureSource" TEXT,
  "calories" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "protein" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fiber" DOUBLE PRECISION,
  "sodium" DOUBLE PRECISION,
  "notes" TEXT,
  "presentation" JSONB,
  "timesUsed" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "meal_plan_library_foods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meal_plan_library_meals" (
  "id" TEXT NOT NULL,
  "nutritionistId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "defaultTime" TEXT,
  "notes" TEXT,
  "presentation" JSONB,
  "timesUsed" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "meal_plan_library_meals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meal_plan_library_meal_items" (
  "id" TEXT NOT NULL,
  "savedMealId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "source" "MealItemSource" NOT NULL DEFAULT 'CUSTOM',
  "tacoFoodId" TEXT,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "householdMeasure" TEXT,
  "householdMeasureSource" TEXT,
  "calories" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "protein" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fiber" DOUBLE PRECISION,
  "sodium" DOUBLE PRECISION,
  "notes" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "presentation" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "meal_plan_library_meal_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "meal_plan_library_foods_nutritionistId_updatedAt_idx"
  ON "meal_plan_library_foods"("nutritionistId", "updatedAt");
CREATE INDEX "meal_plan_library_foods_nutritionistId_name_idx"
  ON "meal_plan_library_foods"("nutritionistId", "name");
CREATE INDEX "meal_plan_library_meals_nutritionistId_updatedAt_idx"
  ON "meal_plan_library_meals"("nutritionistId", "updatedAt");
CREATE INDEX "meal_plan_library_meals_nutritionistId_name_idx"
  ON "meal_plan_library_meals"("nutritionistId", "name");
CREATE INDEX "meal_plan_library_meal_items_savedMealId_position_idx"
  ON "meal_plan_library_meal_items"("savedMealId", "position");

ALTER TABLE "meal_plan_library_foods"
  ADD CONSTRAINT "meal_plan_library_foods_nutritionistId_fkey"
  FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meal_plan_library_meals"
  ADD CONSTRAINT "meal_plan_library_meals_nutritionistId_fkey"
  FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meal_plan_library_meal_items"
  ADD CONSTRAINT "meal_plan_library_meal_items_savedMealId_fkey"
  FOREIGN KEY ("savedMealId") REFERENCES "meal_plan_library_meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
