-- CreateTable
CREATE TABLE "storage_usage_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "totalBytes" INTEGER NOT NULL,
    "totalFiles" INTEGER NOT NULL,
    "quotaBytes" INTEGER,
    "usedPercent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storage_usage_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_usage_by_purpose_snapshots" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "fileCount" INTEGER NOT NULL,

    CONSTRAINT "storage_usage_by_purpose_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "storage_usage_snapshots_tenantId_snapshotDate_key" ON "storage_usage_snapshots"("tenantId", "snapshotDate");

-- CreateIndex
CREATE INDEX "storage_usage_snapshots_tenantId_snapshotDate_idx" ON "storage_usage_snapshots"("tenantId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "storage_usage_by_purpose_snapshots_snapshotId_purpose_key" ON "storage_usage_by_purpose_snapshots"("snapshotId", "purpose");

-- CreateIndex
CREATE INDEX "storage_usage_by_purpose_snapshots_tenantId_purpose_snapsh_idx" ON "storage_usage_by_purpose_snapshots"("tenantId", "purpose", "snapshotId");

-- AddForeignKey
ALTER TABLE "storage_usage_snapshots" ADD CONSTRAINT "storage_usage_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_usage_by_purpose_snapshots" ADD CONSTRAINT "storage_usage_by_purpose_snapshots_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "storage_usage_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
