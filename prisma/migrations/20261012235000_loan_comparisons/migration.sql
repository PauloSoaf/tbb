-- Saved comparisons of credit options (inputs only). A study, never a debt.
CREATE TABLE "LoanComparison" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanComparison_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoanComparison_workspaceId_updatedAt_idx" ON "LoanComparison"("workspaceId", "updatedAt");

ALTER TABLE "LoanComparison" ADD CONSTRAINT "LoanComparison_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoanComparison" ADD CONSTRAINT "LoanComparison_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 120);
ALTER TABLE "LoanComparison" ADD CONSTRAINT "LoanComparison_version_check" CHECK ("version" >= 1);
ALTER TABLE "LoanComparison" ADD CONSTRAINT "LoanComparison_payload_check" CHECK (jsonb_typeof("payload") = 'object' AND pg_column_size("payload") <= 65536);
