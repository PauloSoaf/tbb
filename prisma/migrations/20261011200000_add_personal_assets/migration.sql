CREATE TYPE "PersonalAssetKind" AS ENUM ('VEHICLE', 'ELECTRONIC', 'PROPERTY', 'OTHER');

CREATE TABLE "PersonalAsset" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PersonalAssetKind" NOT NULL,
    "valueCents" INTEGER NOT NULL,
    "valuationDate" DATE NOT NULL,
    "purchaseValueCents" INTEGER,
    "purchaseDate" DATE,
    "notes" TEXT,
    "debtId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PersonalAsset_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PersonalAsset_value_check" CHECK ("valueCents" >= 0 AND ("purchaseValueCents" IS NULL OR "purchaseValueCents" >= 0)),
    CONSTRAINT "PersonalAsset_version_check" CHECK ("version" > 0),
    CONSTRAINT "PersonalAsset_dates_check" CHECK ("purchaseDate" IS NULL OR "purchaseDate" <= "valuationDate")
);

CREATE INDEX "PersonalAsset_workspaceId_archivedAt_idx" ON "PersonalAsset"("workspaceId", "archivedAt");
CREATE INDEX "PersonalAsset_debtId_idx" ON "PersonalAsset"("debtId");
ALTER TABLE "PersonalAsset" ADD CONSTRAINT "PersonalAsset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalAsset" ADD CONSTRAINT "PersonalAsset_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
