-- Keep known bills and confirmed paid history with an unknown exact due date.
-- OPEN statements still require a date; monthly projections remain forecasts.
ALTER TABLE "CardStatement" DROP CONSTRAINT "CardStatement_period_check";
ALTER TABLE "CardStatement" ADD CONSTRAINT "CardStatement_period_check" CHECK (
  ("kind" = 'STATEMENT' AND "dueDate" IS NOT NULL AND "periodKey" = 'due:' || to_char("dueDate", 'YYYY-MM-DD'))
  OR ("kind" = 'STATEMENT' AND "dueDate" IS NULL AND "referenceMonth" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    AND (("status" = 'FUTURE_KNOWN' AND "periodKey" = 'known-month:' || "referenceMonth")
      OR ("status" = 'PAID' AND "periodKey" = 'history-month:' || "referenceMonth")))
  OR ("kind" = 'MONTHLY_PROJECTION' AND "dueDate" IS NULL AND "referenceMonth" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND "periodKey" = 'month:' || "referenceMonth")
);
ALTER TABLE "FinancialEvidence" ADD COLUMN "paymentId" TEXT;
CREATE INDEX "FinancialEvidence_paymentId_idx" ON "FinancialEvidence"("paymentId");
ALTER TABLE "FinancialEvidence" ADD CONSTRAINT "FinancialEvidence_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "CardStatementPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialEvidence" ADD CONSTRAINT "FinancialEvidence_one_target_check" CHECK ("transactionId" IS NULL OR "paymentId" IS NULL);
ALTER TABLE "CardStatementPayment" ADD CONSTRAINT "CardStatementPayment_positive_check" CHECK ("amountCents" > 0);
ALTER TABLE "FinancialSource" ADD CONSTRAINT "FinancialSource_content_check" CHECK ("byteLength" = octet_length("content") AND "byteLength" BETWEEN 1 AND 5000000 AND "sha256" ~ '^[a-f0-9]{64}$');
ALTER TABLE "CardStatement" ADD CONSTRAINT "CardStatement_rollover_not_self_check" CHECK ("rolledIntoStatementId" IS NULL OR "rolledIntoStatementId" <> "id");
