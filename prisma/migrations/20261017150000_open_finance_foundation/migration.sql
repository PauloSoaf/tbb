-- CreateTable
CREATE TABLE "OpenFinanceConnection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'MEUPLUGGY',
    "itemIdCipher" TEXT NOT NULL,
    "itemIdHash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "institutionName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "providerStatus" TEXT,
    "providerExecutionStatus" TEXT,
    "providerUpdatedAt" TIMESTAMP(3),
    "nextAutoSyncAt" TIMESTAMP(3),
    "consentExpiresAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "syncLeaseUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenFinanceConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenFinanceAccountLink" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "accountId" TEXT,
    "kind" TEXT NOT NULL,
    "subtype" TEXT,
    "displayName" TEXT NOT NULL,
    "maskedNumber" TEXT,
    "syncFromDate" DATE,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "providerBalanceCents" INTEGER,
    "providerBalanceAt" TIMESTAMP(3),
    "lastTransactionDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenFinanceAccountLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenFinanceSyncRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "accountsSeen" INTEGER NOT NULL DEFAULT 0,
    "transactionsFetched" INTEGER NOT NULL DEFAULT 0,
    "pendingSkipped" INTEGER NOT NULL DEFAULT 0,
    "outsideWindow" INTEGER NOT NULL DEFAULT 0,
    "staged" INTEGER NOT NULL DEFAULT 0,
    "autoCreated" INTEGER NOT NULL DEFAULT 0,
    "needsReview" INTEGER NOT NULL DEFAULT 0,
    "alreadyKnown" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,

    CONSTRAINT "OpenFinanceSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpenFinanceConnection_workspaceId_status_idx" ON "OpenFinanceConnection"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OpenFinanceConnection_id_workspaceId_key" ON "OpenFinanceConnection"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "OpenFinanceConnection_workspaceId_itemIdHash_key" ON "OpenFinanceConnection"("workspaceId", "itemIdHash");

-- CreateIndex
CREATE INDEX "OpenFinanceAccountLink_workspaceId_accountId_idx" ON "OpenFinanceAccountLink"("workspaceId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "OpenFinanceAccountLink_connectionId_externalAccountId_key" ON "OpenFinanceAccountLink"("connectionId", "externalAccountId");

-- CreateIndex
CREATE INDEX "OpenFinanceSyncRun_workspaceId_connectionId_startedAt_idx" ON "OpenFinanceSyncRun"("workspaceId", "connectionId", "startedAt");

-- AddForeignKey
ALTER TABLE "OpenFinanceConnection" ADD CONSTRAINT "OpenFinanceConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenFinanceAccountLink" ADD CONSTRAINT "OpenFinanceAccountLink_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenFinanceAccountLink" ADD CONSTRAINT "OpenFinanceAccountLink_connectionId_workspaceId_fkey" FOREIGN KEY ("connectionId", "workspaceId") REFERENCES "OpenFinanceConnection"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenFinanceAccountLink" ADD CONSTRAINT "OpenFinanceAccountLink_accountId_workspaceId_fkey" FOREIGN KEY ("accountId", "workspaceId") REFERENCES "Account"("id", "workspaceId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OpenFinanceSyncRun" ADD CONSTRAINT "OpenFinanceSyncRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenFinanceSyncRun" ADD CONSTRAINT "OpenFinanceSyncRun_connectionId_workspaceId_fkey" FOREIGN KEY ("connectionId", "workspaceId") REFERENCES "OpenFinanceConnection"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;
