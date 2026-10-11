-- CreateEnum
CREATE TYPE "StatementDetailMode" AS ENUM ('ALREADY_INCLUDED', 'ADDED_TO_STATEMENT');

-- AlterTable
ALTER TABLE "FinanceTransaction" ADD COLUMN     "cardStatementId" TEXT,
ADD COLUMN     "statementDetailMode" "StatementDetailMode";

-- CreateIndex
CREATE UNIQUE INDEX "CardStatement_id_accountId_workspaceId_key" ON "CardStatement"("id", "accountId", "workspaceId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_workspaceId_cardStatementId_idx" ON "FinanceTransaction"("workspaceId", "cardStatementId");

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_cardStatementId_accountId_workspaceId_fkey" FOREIGN KEY ("cardStatementId", "accountId", "workspaceId") REFERENCES "CardStatement"("id", "accountId", "workspaceId") ON DELETE NO ACTION ON UPDATE NO ACTION;


-- A detailed card purchase always says whether it was already inside the statement or added to it.
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_statement_detail_check" CHECK (("cardStatementId" IS NULL) = ("statementDetailMode" IS NULL));
