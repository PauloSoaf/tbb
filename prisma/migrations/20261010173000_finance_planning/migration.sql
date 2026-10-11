CREATE TABLE "FinancePlan" (
  "workspaceId" TEXT NOT NULL PRIMARY KEY,
  "incomeCents" INTEGER NOT NULL DEFAULT 0 CHECK ("incomeCents" >= 0),
  "payDay" INTEGER CHECK ("payDay" BETWEEN 1 AND 31),
  "receivingAccountId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancePlan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FinancePlan_receivingAccountId_workspaceId_fkey" FOREIGN KEY ("receivingAccountId", "workspaceId") REFERENCES "Account"("id", "workspaceId") ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE TABLE "FixedExpense" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0),
  "dueDay" INTEGER CHECK ("dueDay" BETWEEN 1 AND 31),
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FixedExpense_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "FixedExpense_workspaceId_isActive_idx" ON "FixedExpense"("workspaceId", "isActive");
