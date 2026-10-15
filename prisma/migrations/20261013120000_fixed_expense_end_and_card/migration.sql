-- A planned monthly expense can end (the last day it is expected) and can be charged to a credit card, so the
-- salary plan stops counting the same money twice: once as the expense and once inside that card's statement.
-- Both columns are optional and nothing is backfilled, so every existing plan keeps behaving exactly as before.
ALTER TABLE "FixedExpense" ADD COLUMN "endsOn" DATE;
ALTER TABLE "FixedExpense" ADD COLUMN "cardAccountId" TEXT;
ALTER TABLE "FixedExpense" ADD CONSTRAINT "FixedExpense_endsOn_check" CHECK ("endsOn" IS NULL OR "endsOn" >= DATE '2000-01-01');
-- Same workspace as the expense, enforced by the composite key (a NULL card id skips the check).
ALTER TABLE "FixedExpense" ADD CONSTRAINT "FixedExpense_cardAccountId_workspaceId_fkey" FOREIGN KEY ("cardAccountId", "workspaceId") REFERENCES "Account"("id", "workspaceId") ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE INDEX "FixedExpense_cardAccountId_workspaceId_idx" ON "FixedExpense"("cardAccountId", "workspaceId");
