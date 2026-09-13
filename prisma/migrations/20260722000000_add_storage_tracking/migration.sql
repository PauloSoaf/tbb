-- CreateTable
CREATE TABLE "storage_files" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "resourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storage_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "storage_files_tenantId_idx" ON "storage_files"("tenantId");

-- CreateIndex
CREATE INDEX "storage_files_tenantId_purpose_idx" ON "storage_files"("tenantId", "purpose");

-- AddForeignKey
ALTER TABLE "storage_files" ADD CONSTRAINT "storage_files_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "nutritionists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
