-- Migration: add_shopping_lists
-- Created: 2026-06-29

-- Enums
CREATE TYPE "ShoppingListStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "ShoppingListItemSource" AS ENUM ('MEAL_PLAN', 'MANUAL', 'SUBSTITUTION');
CREATE TYPE "ShoppingListCategory" AS ENUM ('FRUITS', 'VEGETABLES', 'PROTEINS', 'GRAINS', 'DAIRY', 'LEGUMES', 'OILS', 'SEASONINGS', 'BEVERAGES', 'SUPPLEMENTS', 'OTHER');

-- ShoppingList table
CREATE TABLE "shopping_lists" (
    "id" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "mealPlanId" TEXT,
    "title" TEXT NOT NULL,
    "status" "ShoppingListStatus" NOT NULL DEFAULT 'ACTIVE',
    "periodDays" INTEGER NOT NULL DEFAULT 7,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "generatedFromPlan" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_lists_pkey" PRIMARY KEY ("id")
);

-- ShoppingListItem table
CREATE TABLE "shopping_list_items" (
    "id" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "shoppingListId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT,
    "category" "ShoppingListCategory" NOT NULL DEFAULT 'OTHER',
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "householdMeasure" TEXT,
    "source" "ShoppingListItemSource" NOT NULL DEFAULT 'MEAL_PLAN',
    "mealItemId" TEXT,
    "tacoFoodId" TEXT,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3),
    "notes" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_list_items_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "shopping_lists_nutritionistId_idx" ON "shopping_lists"("nutritionistId");
CREATE INDEX "shopping_lists_patientId_idx" ON "shopping_lists"("patientId");
CREATE INDEX "shopping_lists_mealPlanId_idx" ON "shopping_lists"("mealPlanId");
CREATE INDEX "shopping_lists_status_idx" ON "shopping_lists"("status");
CREATE INDEX "shopping_lists_createdAt_idx" ON "shopping_lists"("createdAt");
CREATE INDEX "shopping_list_items_nutritionistId_idx" ON "shopping_list_items"("nutritionistId");
CREATE INDEX "shopping_list_items_shoppingListId_idx" ON "shopping_list_items"("shoppingListId");
CREATE INDEX "shopping_list_items_checked_idx" ON "shopping_list_items"("checked");
CREATE INDEX "shopping_list_items_category_idx" ON "shopping_list_items"("category");
CREATE INDEX "shopping_list_items_position_idx" ON "shopping_list_items"("position");

-- Foreign Keys
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "meal_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_shoppingListId_fkey" FOREIGN KEY ("shoppingListId") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
