-- Add Google Calendar OAuth fields to nutritionists
ALTER TABLE "nutritionists" ADD COLUMN IF NOT EXISTS "googleAccessToken" TEXT;
ALTER TABLE "nutritionists" ADD COLUMN IF NOT EXISTS "googleRefreshToken" TEXT;
ALTER TABLE "nutritionists" ADD COLUMN IF NOT EXISTS "googleTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "nutritionists" ADD COLUMN IF NOT EXISTS "googleCalendarId" TEXT;
