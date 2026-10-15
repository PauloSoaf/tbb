-- Manual payments: the owner can declare a card payment without knowing the exact day, and every
-- payment records where it came from. Document payments keep a mandatory date.
ALTER TABLE "CardStatementPayment" ADD COLUMN "origin" TEXT NOT NULL DEFAULT 'DOCUMENT',
ALTER COLUMN "date" DROP NOT NULL;
ALTER TABLE "CardStatementPayment" ADD CONSTRAINT "CardStatementPayment_origin_check" CHECK ("origin" IN ('DOCUMENT', 'MANUAL_VERIFIED'));
ALTER TABLE "CardStatementPayment" ADD CONSTRAINT "CardStatementPayment_document_date_check" CHECK ("origin" <> 'DOCUMENT' OR "date" IS NOT NULL);
