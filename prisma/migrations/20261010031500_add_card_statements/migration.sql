-- CreateEnum
CREATE TYPE "CardStatementKind" AS ENUM ('STATEMENT', 'MONTHLY_PROJECTION');

-- CreateEnum
CREATE TYPE "CardStatementStatus" AS ENUM ('PAID', 'OPEN', 'FUTURE_KNOWN', 'FORECAST');

-- CreateEnum
CREATE TYPE "CardStatementReconciliation" AS ENUM ('NOT_REQUIRED', 'PENDING', 'INCLUDED_IN_STATEMENT', 'SEPARATE_CHARGE');

-- CreateTable
CREATE TABLE "CardStatement" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "kind" "CardStatementKind" NOT NULL,
    "status" "CardStatementStatus" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "dueDate" DATE,
    "closingDate" DATE,
    "closingDay" INTEGER,
    "referenceMonth" TEXT,
    "paidAt" DATE,
    "reconciliation" "CardStatementReconciliation" NOT NULL DEFAULT 'NOT_REQUIRED',
    "overlapsStatementId" TEXT,
    "sourceRecordType" TEXT NOT NULL,
    "sourceAsOf" DATE NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL_IMPORT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardStatement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardStatement_workspaceId_status_dueDate_idx" ON "CardStatement"("workspaceId", "status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "CardStatement_id_workspaceId_key" ON "CardStatement"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "CardStatement_workspaceId_externalKey_key" ON "CardStatement"("workspaceId", "externalKey");

-- CreateIndex
CREATE UNIQUE INDEX "CardStatement_workspaceId_accountId_periodKey_key" ON "CardStatement"("workspaceId", "accountId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "Account_id_workspaceId_key" ON "Account"("id", "workspaceId");

-- AddForeignKey
ALTER TABLE "CardStatement" ADD CONSTRAINT "CardStatement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardStatement" ADD CONSTRAINT "CardStatement_accountId_workspaceId_fkey" FOREIGN KEY ("accountId", "workspaceId") REFERENCES "Account"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardStatement" ADD CONSTRAINT "CardStatement_overlapsStatementId_workspaceId_fkey" FOREIGN KEY ("overlapsStatementId", "workspaceId") REFERENCES "CardStatement"("id", "workspaceId") ON DELETE NO ACTION ON UPDATE NO ACTION;


-- Financial integrity rules Prisma cannot express. They keep imported card data
-- faithful to its source: no negative amounts, no invented due dates for monthly
-- projections, payment dates only on paid statements, and a natural key that
-- always matches the stored due date or reference month.
ALTER TABLE "CardStatement" ADD CONSTRAINT "CardStatement_amount_check" CHECK ("amountCents" >= 0);
ALTER TABLE "CardStatement" ADD CONSTRAINT "CardStatement_closingDay_check" CHECK ("closingDay" IS NULL OR "closingDay" BETWEEN 1 AND 31);
ALTER TABLE "CardStatement" ADD CONSTRAINT "CardStatement_kind_status_check" CHECK (("kind" = 'MONTHLY_PROJECTION') = ("status" = 'FORECAST'));
ALTER TABLE "CardStatement" ADD CONSTRAINT "CardStatement_period_check" CHECK (
  ("kind" = 'STATEMENT' AND "dueDate" IS NOT NULL AND "periodKey" = 'due:' || to_char("dueDate", 'YYYY-MM-DD'))
  OR ("kind" = 'MONTHLY_PROJECTION' AND "dueDate" IS NULL AND "referenceMonth" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND "periodKey" = 'month:' || "referenceMonth")
);
ALTER TABLE "CardStatement" ADD CONSTRAINT "CardStatement_paidAt_check" CHECK ("paidAt" IS NULL OR "status" = 'PAID');
ALTER TABLE "CardStatement" ADD CONSTRAINT "CardStatement_closing_before_due_check" CHECK ("closingDate" IS NULL OR "dueDate" IS NULL OR "closingDate" <= "dueDate");
ALTER TABLE "CardStatement" ADD CONSTRAINT "CardStatement_overlap_check" CHECK (
  ("overlapsStatementId" IS NULL OR "overlapsStatementId" <> "id")
  AND (("reconciliation" = 'NOT_REQUIRED') = ("overlapsStatementId" IS NULL))
);
