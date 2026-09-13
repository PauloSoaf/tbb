-- AlterTable
ALTER TABLE "storage_files" ADD COLUMN "uploadedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "storage_files_tenantId_uploadedByUserId_idx" ON "storage_files"("tenantId", "uploadedByUserId");

-- CreateTable
CREATE TABLE "tenant_feature_overrides" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "limit" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_feature_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_feature_overrides_tenantId_key_key" ON "tenant_feature_overrides"("tenantId", "key");

-- CreateIndex
CREATE INDEX "tenant_feature_overrides_tenantId_idx" ON "tenant_feature_overrides"("tenantId");

-- AddForeignKey
ALTER TABLE "tenant_feature_overrides" ADD CONSTRAINT "tenant_feature_overrides_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "global_audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorNameSnapshot" TEXT NOT NULL,
    "actorRoleSnapshot" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceLabelSnapshot" TEXT,
    "result" "AuditResult" NOT NULL DEFAULT 'SUCCESS',
    "reason" TEXT,
    "changedFields" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "global_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "global_audit_logs_createdAt_idx" ON "global_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "global_audit_logs_action_createdAt_idx" ON "global_audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "global_audit_logs_resource_resourceId_idx" ON "global_audit_logs"("resource", "resourceId");
