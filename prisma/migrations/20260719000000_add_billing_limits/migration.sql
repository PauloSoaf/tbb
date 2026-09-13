-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- AlterTable: tenant_subscriptions.status TEXT -> BillingStatus enum
ALTER TABLE "tenant_subscriptions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_subscriptions" ALTER COLUMN "status" TYPE "BillingStatus" USING ("status"::"BillingStatus");
ALTER TABLE "tenant_subscriptions" ALTER COLUMN "status" SET DEFAULT 'TRIAL';

-- CreateTable
CREATE TABLE "feature_limits" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "limit" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_counters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_limits_planId_key_key" ON "feature_limits"("planId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "usage_counters_tenantId_key_periodStart_key" ON "usage_counters"("tenantId", "key", "periodStart");

-- CreateIndex
CREATE INDEX "usage_counters_tenantId_key_idx" ON "usage_counters"("tenantId", "key");

-- AddForeignKey
ALTER TABLE "feature_limits" ADD CONSTRAINT "feature_limits_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
