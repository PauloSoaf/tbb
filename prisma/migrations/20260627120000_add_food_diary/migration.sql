-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'SUPPER', 'OTHER');

-- CreateTable
CREATE TABLE "food_diary_entries" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "mealType" "MealType" NOT NULL DEFAULT 'OTHER',
    "eatenAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "imageUrl" TEXT,
    "hungerBefore" INTEGER,
    "satietyAfter" INTEGER,
    "moodBefore" TEXT,
    "mood" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_diary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_diary_items" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "foodName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "calories" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "protein" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "food_diary_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "food_diary_entries_patientId_idx" ON "food_diary_entries"("patientId");
CREATE INDEX "food_diary_entries_eatenAt_idx" ON "food_diary_entries"("eatenAt");
CREATE INDEX "food_diary_items_entryId_idx" ON "food_diary_items"("entryId");

-- AddForeignKey
ALTER TABLE "food_diary_entries" ADD CONSTRAINT "food_diary_entries_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "food_diary_items" ADD CONSTRAINT "food_diary_items_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "food_diary_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
