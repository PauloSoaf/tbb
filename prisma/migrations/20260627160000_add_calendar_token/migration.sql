-- Migration: add calendarToken to nutritionists
-- Used by /api/calendar/sync for iCal feed per-nutritionist

ALTER TABLE "nutritionists" ADD COLUMN IF NOT EXISTS "calendarToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "nutritionists_calendarToken_key" ON "nutritionists"("calendarToken");
