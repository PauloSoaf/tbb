-- AlterTable
ALTER TABLE "CardStatement" ADD COLUMN     "amountIsOutstanding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rolledIntoStatementId" TEXT;

-- AlterTable
ALTER TABLE "FinanceTransaction" ADD COLUMN     "dateBasis" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "eventKind" TEXT NOT NULL DEFAULT 'PURCHASE',
ADD COLUMN     "exchangeRate" TEXT,
ADD COLUMN     "isConsumption" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "occurredAt" TIMESTAMP(3),
ADD COLUMN     "occurredTimezone" TEXT,
ADD COLUMN     "originalAmountCents" INTEGER,
ADD COLUMN     "originalCurrency" TEXT,
ADD COLUMN     "postedDate" DATE,
ADD COLUMN     "purchasedDate" DATE,
ADD COLUMN     "subscriptionId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "amountIsEstimate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nextChargeIsEstimate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalAmountCents" INTEGER,
ADD COLUMN     "originalCurrency" TEXT;

-- CreateTable
CREATE TABLE "FinancialSource" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "byteLength" INTEGER NOT NULL,
    "importBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialEvidence" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "locator" TEXT NOT NULL,
    "candidate" JSONB NOT NULL,
    "originalCandidate" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "decision" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
    "reason" TEXT,
    "transactionId" TEXT,
    "importBatchId" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "locator" TEXT NOT NULL,
    "asOfDate" DATE NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardStatementPayment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "cardStatementId" TEXT,
    "fingerprint" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "sourceId" TEXT NOT NULL,
    "locator" TEXT NOT NULL,
    "importBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardStatementPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialSource_importBatchId_idx" ON "FinancialSource"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialSource_id_workspaceId_key" ON "FinancialSource"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialSource_workspaceId_accountId_sha256_key" ON "FinancialSource"("workspaceId", "accountId", "sha256");

-- CreateIndex
CREATE INDEX "FinancialEvidence_workspaceId_decision_idx" ON "FinancialEvidence"("workspaceId", "decision");

-- CreateIndex
CREATE INDEX "FinancialEvidence_transactionId_idx" ON "FinancialEvidence"("transactionId");

-- CreateIndex
CREATE INDEX "FinancialEvidence_importBatchId_idx" ON "FinancialEvidence"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialEvidence_sourceId_locator_key" ON "FinancialEvidence"("sourceId", "locator");

-- CreateIndex
CREATE INDEX "FinancialSnapshot_workspaceId_accountId_kind_asOfDate_idx" ON "FinancialSnapshot"("workspaceId", "accountId", "kind", "asOfDate");

-- CreateIndex
CREATE INDEX "FinancialSnapshot_statementId_idx" ON "FinancialSnapshot"("statementId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialSnapshot_sourceId_locator_key" ON "FinancialSnapshot"("sourceId", "locator");

-- CreateIndex
CREATE INDEX "CardStatementPayment_cardStatementId_accountId_workspaceId_idx" ON "CardStatementPayment"("cardStatementId", "accountId", "workspaceId");

-- CreateIndex
CREATE INDEX "CardStatementPayment_workspaceId_accountId_date_idx" ON "CardStatementPayment"("workspaceId", "accountId", "date");

-- CreateIndex
CREATE INDEX "CardStatementPayment_importBatchId_idx" ON "CardStatementPayment"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "CardStatementPayment_workspaceId_fingerprint_key" ON "CardStatementPayment"("workspaceId", "fingerprint");

-- CreateIndex
CREATE INDEX "CardStatement_rolledIntoStatementId_accountId_workspaceId_idx" ON "CardStatement"("rolledIntoStatementId", "accountId", "workspaceId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_subscriptionId_idx" ON "FinanceTransaction"("subscriptionId");

-- AddForeignKey
ALTER TABLE "CardStatement" ADD CONSTRAINT "CardStatement_rolledIntoStatementId_accountId_workspaceId_fkey" FOREIGN KEY ("rolledIntoStatementId", "accountId", "workspaceId") REFERENCES "CardStatement"("id", "accountId", "workspaceId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialSource" ADD CONSTRAINT "FinancialSource_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialSource" ADD CONSTRAINT "FinancialSource_accountId_workspaceId_fkey" FOREIGN KEY ("accountId", "workspaceId") REFERENCES "Account"("id", "workspaceId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEvidence" ADD CONSTRAINT "FinancialEvidence_sourceId_workspaceId_fkey" FOREIGN KEY ("sourceId", "workspaceId") REFERENCES "FinancialSource"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEvidence" ADD CONSTRAINT "FinancialEvidence_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FinanceTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialSnapshot" ADD CONSTRAINT "FinancialSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialSnapshot" ADD CONSTRAINT "FinancialSnapshot_accountId_workspaceId_fkey" FOREIGN KEY ("accountId", "workspaceId") REFERENCES "Account"("id", "workspaceId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialSnapshot" ADD CONSTRAINT "FinancialSnapshot_sourceId_workspaceId_fkey" FOREIGN KEY ("sourceId", "workspaceId") REFERENCES "FinancialSource"("id", "workspaceId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardStatementPayment" ADD CONSTRAINT "CardStatementPayment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardStatementPayment" ADD CONSTRAINT "CardStatementPayment_accountId_workspaceId_fkey" FOREIGN KEY ("accountId", "workspaceId") REFERENCES "Account"("id", "workspaceId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardStatementPayment" ADD CONSTRAINT "CardStatementPayment_cardStatementId_accountId_workspaceId_fkey" FOREIGN KEY ("cardStatementId", "accountId", "workspaceId") REFERENCES "CardStatement"("id", "accountId", "workspaceId") ON DELETE NO ACTION ON UPDATE NO ACTION;

