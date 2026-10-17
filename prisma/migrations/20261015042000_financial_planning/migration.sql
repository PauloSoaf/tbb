-- Additive planning and optional settlement reconciliation. Existing records are preserved.
BEGIN;
-- DropForeignKey
ALTER TABLE "Budget" DROP CONSTRAINT "Budget_categoryId_fkey";

-- AlterTable
ALTER TABLE "FinanceTransaction" ADD COLUMN     "fixedExpenseId" TEXT;

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "baselineAt" TIMESTAMP(3),
ADD COLUMN     "baselineDate" DATE,
ADD COLUMN     "excludeFixed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "filterAccountIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "filterCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'CATEGORY_BUDGET',
ADD COLUMN     "name" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scope" TEXT NOT NULL DEFAULT 'CATEGORY',
ADD COLUMN     "statementId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Manaus',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "categoryId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "fixedExpenseId" TEXT;

-- AlterTable
ALTER TABLE "SavingsGoal" ADD COLUMN     "contributionFrequency" TEXT NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "debtId" TEXT,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "monthlyContributionCents" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "recurrence" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "FixedExpense" ADD COLUMN     "amountIsEstimate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "beneficiary" TEXT,
ADD COLUMN     "confirmationStatus" TEXT NOT NULL DEFAULT 'CONFIRMED',
ADD COLUMN     "expectedMaxCents" INTEGER,
ADD COLUMN     "expectedMinCents" INTEGER,
ADD COLUMN     "paymentAccountId" TEXT,
ADD COLUMN     "paymentMethod" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "pixKeyEncrypted" TEXT,
ADD COLUMN     "safetyMarginCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startsOn" DATE,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "CardStatementPayment" ADD COLUMN     "bankReconciliation" TEXT NOT NULL DEFAULT 'LEGACY_UNKNOWN',
ADD COLUMN     "bankTransactionId" TEXT;

-- CreateTable
CREATE TABLE "MonthlyFinancialPlan" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "incomeOverrideCents" INTEGER,
    "extraIncomeCents" INTEGER NOT NULL DEFAULT 0,
    "extraIncomeStatus" TEXT NOT NULL DEFAULT 'EXPECTED',
    "variableBudgetCents" INTEGER,
    "variableCardAccountId" TEXT,
    "otherOutflowCents" INTEGER NOT NULL DEFAULT 0,
    "otherOutflowDescription" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyFinancialPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetTransactionReview" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetTransactionReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsContribution" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "transactionId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'ALLOCATION',
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancePlanningReview" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "subjectKind" TEXT NOT NULL,
    "subjectId" TEXT,
    "fixedExpenseId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confidence" TEXT NOT NULL DEFAULT 'REVIEW',
    "notes" TEXT,
    "metadata" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancePlanningReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyFinancialPlan_workspaceId_month_key" ON "MonthlyFinancialPlan"("workspaceId", "month");

-- CreateIndex
CREATE INDEX "BudgetTransactionReview_workspaceId_budgetId_decision_idx" ON "BudgetTransactionReview"("workspaceId", "budgetId", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetTransactionReview_budgetId_transactionId_key" ON "BudgetTransactionReview"("budgetId", "transactionId");

-- CreateIndex
CREATE INDEX "SavingsContribution_workspaceId_goalId_date_idx" ON "SavingsContribution"("workspaceId", "goalId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SavingsContribution_workspaceId_fingerprint_key" ON "SavingsContribution"("workspaceId", "fingerprint");

-- CreateIndex
CREATE INDEX "FinancePlanningReview_workspaceId_status_idx" ON "FinancePlanningReview"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FinancePlanningReview_workspaceId_fingerprint_key" ON "FinancePlanningReview"("workspaceId", "fingerprint");

-- CreateIndex
CREATE INDEX "FinanceTransaction_workspaceId_fixedExpenseId_date_idx" ON "FinanceTransaction"("workspaceId", "fixedExpenseId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceTransaction_id_workspaceId_key" ON "FinanceTransaction"("id", "workspaceId");

-- CreateIndex
CREATE INDEX "Budget_workspaceId_kind_status_startDate_endDate_idx" ON "Budget"("workspaceId", "kind", "status", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_id_workspaceId_key" ON "Budget"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Debt_id_workspaceId_key" ON "Debt"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "SavingsGoal_id_workspaceId_key" ON "SavingsGoal"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "FixedExpense_id_workspaceId_key" ON "FixedExpense"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "CardStatementPayment_bankTransactionId_key" ON "CardStatementPayment"("bankTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "CardStatementPayment_bankTransactionId_workspaceId_key" ON "CardStatementPayment"("bankTransactionId", "workspaceId");

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_fixedExpenseId_workspaceId_fkey" FOREIGN KEY ("fixedExpenseId", "workspaceId") REFERENCES "FixedExpense"("id", "workspaceId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_statementId_workspaceId_fkey" FOREIGN KEY ("statementId", "workspaceId") REFERENCES "CardStatement"("id", "workspaceId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_fixedExpenseId_workspaceId_fkey" FOREIGN KEY ("fixedExpenseId", "workspaceId") REFERENCES "FixedExpense"("id", "workspaceId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SavingsGoal" ADD CONSTRAINT "SavingsGoal_debtId_workspaceId_fkey" FOREIGN KEY ("debtId", "workspaceId") REFERENCES "Debt"("id", "workspaceId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FixedExpense" ADD CONSTRAINT "FixedExpense_paymentAccountId_workspaceId_fkey" FOREIGN KEY ("paymentAccountId", "workspaceId") REFERENCES "Account"("id", "workspaceId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CardStatementPayment" ADD CONSTRAINT "CardStatementPayment_bankTransactionId_workspaceId_fkey" FOREIGN KEY ("bankTransactionId", "workspaceId") REFERENCES "FinanceTransaction"("id", "workspaceId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MonthlyFinancialPlan" ADD CONSTRAINT "MonthlyFinancialPlan_variableCardAccountId_workspaceId_fkey" FOREIGN KEY ("variableCardAccountId", "workspaceId") REFERENCES "Account"("id", "workspaceId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MonthlyFinancialPlan" ADD CONSTRAINT "MonthlyFinancialPlan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetTransactionReview" ADD CONSTRAINT "BudgetTransactionReview_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetTransactionReview" ADD CONSTRAINT "BudgetTransactionReview_budgetId_workspaceId_fkey" FOREIGN KEY ("budgetId", "workspaceId") REFERENCES "Budget"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetTransactionReview" ADD CONSTRAINT "BudgetTransactionReview_transactionId_workspaceId_fkey" FOREIGN KEY ("transactionId", "workspaceId") REFERENCES "FinanceTransaction"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsContribution" ADD CONSTRAINT "SavingsContribution_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsContribution" ADD CONSTRAINT "SavingsContribution_goalId_workspaceId_fkey" FOREIGN KEY ("goalId", "workspaceId") REFERENCES "SavingsGoal"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsContribution" ADD CONSTRAINT "SavingsContribution_transactionId_workspaceId_fkey" FOREIGN KEY ("transactionId", "workspaceId") REFERENCES "FinanceTransaction"("id", "workspaceId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FinancePlanningReview" ADD CONSTRAINT "FinancePlanningReview_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancePlanningReview" ADD CONSTRAINT "FinancePlanningReview_fixedExpenseId_workspaceId_fkey" FOREIGN KEY ("fixedExpenseId", "workspaceId") REFERENCES "FixedExpense"("id", "workspaceId") ON DELETE NO ACTION ON UPDATE NO ACTION;


ALTER TABLE "FixedExpense" ADD CONSTRAINT "FixedExpense_payment_method_check" CHECK ("paymentMethod" IN ('CREDIT_CARD','PIX','BANK_DEBIT','BOLETO','CASH','OTHER','UNKNOWN'));
ALTER TABLE "FixedExpense" ADD CONSTRAINT "FixedExpense_planned_dates_check" CHECK ("startsOn" IS NULL OR "endsOn" IS NULL OR "startsOn" <= "endsOn");
ALTER TABLE "FixedExpense" ADD CONSTRAINT "FixedExpense_estimate_check" CHECK (("expectedMinCents" IS NULL OR "expectedMinCents">=0) AND ("expectedMaxCents" IS NULL OR "expectedMaxCents">=COALESCE("expectedMinCents",0)) AND "safetyMarginCents">=0 AND "amountCents"::bigint+"safetyMarginCents"<=2147483647);
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_planning_kind_check" CHECK ("kind" IN ('CATEGORY_BUDGET','SPENDING_LIMIT') AND ("kind"<>'CATEGORY_BUDGET' OR "categoryId" IS NOT NULL));
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_spending_limit_check" CHECK ("kind"<>'SPENDING_LIMIT' OR ("startDate"<="endDate" AND "limitCents">=0 AND "scope" IN ('GLOBAL','CATEGORY','ACCOUNT','CARD_CYCLE') AND "status" IN ('ACTIVE','PAUSED','CLOSED')));
ALTER TABLE "CardStatementPayment" ADD CONSTRAINT "CardStatementPayment_bank_reconciliation_check" CHECK ("bankReconciliation" IN ('LEGACY_UNKNOWN','STATUS_ONLY','UNRECONCILED','LINKED','CREATED') AND (("bankTransactionId" IS NOT NULL) = ("bankReconciliation" IN ('LINKED','CREATED'))));
ALTER TABLE "MonthlyFinancialPlan" ADD CONSTRAINT "MonthlyFinancialPlan_values_check" CHECK ("month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND ("incomeOverrideCents" IS NULL OR "incomeOverrideCents">=0) AND "extraIncomeCents">=0 AND ("variableBudgetCents" IS NULL OR "variableBudgetCents">=0) AND "otherOutflowCents">=0);
ALTER TABLE "SavingsContribution" ADD CONSTRAINT "SavingsContribution_values_check" CHECK ("amountCents">0 AND "kind" IN ('ALLOCATION','TRANSFER','PAYMENT'));
ALTER TABLE "BudgetTransactionReview" ADD CONSTRAINT "BudgetTransactionReview_decision_check" CHECK ("decision" IN ('BASELINE','COUNT','IGNORE'));
ALTER TABLE "SavingsGoal" ADD CONSTRAINT "SavingsGoal_contribution_check" CHECK ("monthlyContributionCents" IS NULL OR "monthlyContributionCents">=0);

COMMIT;
