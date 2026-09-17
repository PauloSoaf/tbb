-- CreateEnum
CREATE TYPE "InvestmentAccountType" AS ENUM ('BROKERAGE', 'BANK', 'EXCHANGE', 'WALLET', 'REAL_ESTATE', 'CUSTODY', 'OTHER');

-- CreateEnum
CREATE TYPE "InvestmentAssetType" AS ENUM ('CASH_EQUIVALENT', 'SAVINGS', 'CDB', 'LCI', 'LCA', 'TREASURY', 'DEBENTURE', 'FIXED_INCOME_OTHER', 'STOCK', 'ETF', 'BDR', 'FII', 'FIAGRO', 'FUND', 'CRYPTO', 'REAL_ESTATE', 'COMMODITY', 'FOREIGN_ASSET', 'OTHER');

-- CreateEnum
CREATE TYPE "InvestmentTransactionType" AS ENUM ('BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL', 'DIVIDEND', 'INTEREST', 'FEE', 'TAX', 'TRANSFER', 'SPLIT', 'OTHER');

-- CreateEnum
CREATE TYPE "InvestmentIncomeType" AS ENUM ('DIVIDEND', 'JCP', 'FII_DISTRIBUTION', 'INTEREST', 'COUPON', 'RENT', 'OTHER');

-- CreateEnum
CREATE TYPE "InvestmentIndexer" AS ENUM ('CDI_PERCENTAGE', 'CDI_SPREAD', 'PREFIXED', 'IPCA_SPREAD', 'SELIC', 'CUSTOM');

-- CreateEnum
CREATE TYPE "InvestmentLiquidity" AS ENUM ('D0', 'D1', 'DN', 'AT_MATURITY', 'CUSTOM', 'ILLIQUID');

-- CreateEnum
CREATE TYPE "InvestmentBudgetMode" AS ENUM ('FIXED_AMOUNT', 'INCOME_PERCENTAGE', 'MANUAL', 'REMAINING_CASH');

-- CreateEnum
CREATE TYPE "InvestmentTradeDirection" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "InvestmentTradeStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELED');

-- CreateTable
CREATE TABLE "InvestmentAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT,
    "type" "InvestmentAccountType" NOT NULL DEFAULT 'BROKERAGE',
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "linkedFinancialAccountId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentAsset" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ticker" TEXT,
    "exchange" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "type" "InvestmentAssetType" NOT NULL,
    "sector" TEXT,
    "provider" TEXT,
    "providerAssetId" TEXT,
    "isManual" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentPosition" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "quantity" DECIMAL(30,12) NOT NULL DEFAULT 0,
    "bookCostCents" INTEGER NOT NULL DEFAULT 0,
    "averagePriceCents" DECIMAL(30,8) NOT NULL DEFAULT 0,
    "currentValueCents" INTEGER NOT NULL DEFAULT 0,
    "realizedPnlCents" INTEGER NOT NULL DEFAULT 0,
    "lastValuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentTransaction" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "assetId" TEXT,
    "type" "InvestmentTransactionType" NOT NULL,
    "date" DATE NOT NULL,
    "quantity" DECIMAL(30,12),
    "unitPriceCents" DECIMAL(30,8),
    "grossAmountCents" INTEGER NOT NULL,
    "feesCents" INTEGER NOT NULL DEFAULT 0,
    "taxesCents" INTEGER NOT NULL DEFAULT 0,
    "netAmountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "importBatchId" TEXT,
    "financeTransactionId" TEXT,
    "fundingFinancialAccountId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentIncome" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "assetId" TEXT,
    "type" "InvestmentIncomeType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "paymentDate" DATE NOT NULL,
    "financeTransactionId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentIncome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentPrice" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "priceCents" DECIMAL(30,8) NOT NULL,
    "currency" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delayMinutes" INTEGER,

    CONSTRAINT "InvestmentPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentProductDefinition" (
    "id" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "assetType" "InvestmentAssetType" NOT NULL,
    "indexer" "InvestmentIndexer" NOT NULL,
    "indexerPercentageBasisPoints" INTEGER,
    "spreadBasisPoints" INTEGER,
    "fixedRateBasisPoints" INTEGER,
    "eligibility" TEXT,
    "eligibleLimitCents" INTEGER,
    "liquidity" "InvestmentLiquidity",
    "validFrom" DATE NOT NULL,
    "validUntil" DATE,
    "source" TEXT NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentProductDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentFixedIncomeProfile" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "productDefinitionId" TEXT,
    "issuer" TEXT NOT NULL,
    "principalCents" INTEGER NOT NULL,
    "purchaseDate" DATE NOT NULL,
    "maturityDate" DATE,
    "indexer" "InvestmentIndexer" NOT NULL,
    "indexerPercentageBasisPoints" INTEGER,
    "spreadBasisPoints" INTEGER,
    "fixedRateBasisPoints" INTEGER,
    "liquidity" "InvestmentLiquidity" NOT NULL,
    "liquidityDays" INTEGER,
    "taxTreatment" TEXT NOT NULL DEFAULT 'REGRESSIVE_IR',
    "guaranteeMetadata" JSONB NOT NULL DEFAULT '{}',
    "markToMarket" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InvestmentFixedIncomeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentRealEstateProfile" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "purchasePriceCents" INTEGER NOT NULL,
    "purchaseDate" DATE NOT NULL,
    "estimatedValueCents" INTEGER NOT NULL,
    "valuationDate" DATE NOT NULL,
    "monthlyRentCents" INTEGER NOT NULL DEFAULT 0,
    "financingBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "monthlyCostsCents" INTEGER NOT NULL DEFAULT 0,
    "vacancyBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "propertyType" TEXT NOT NULL DEFAULT 'PROPERTY',

    CONSTRAINT "InvestmentRealEstateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentBudget" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "mode" "InvestmentBudgetMode" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "incomePercentageBasisPoints" INTEGER,
    "reserveCents" INTEGER NOT NULL DEFAULT 0,
    "plan" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentAllocationTarget" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "assetType" "InvestmentAssetType" NOT NULL,
    "targetBasisPoints" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentAllocationTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentPortfolioSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "investedCents" INTEGER NOT NULL,
    "marketValueCents" INTEGER NOT NULL,
    "cumulativeContributionsCents" INTEGER NOT NULL,
    "cumulativeIncomeCents" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'CALCULATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentPortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentBenchmark" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "value" DECIMAL(24,10) NOT NULL,
    "referenceDate" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "InvestmentBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentWatchlist" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentWatchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentWatchlistItem" (
    "id" TEXT NOT NULL,
    "watchlistId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "targetPriceCents" DECIMAL(30,8),
    "notes" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentWatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentResearchNote" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "assetId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sources" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentResearchNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentMarketSnapshot" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'FRESH',

    CONSTRAINT "InvestmentMarketSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentGoalLink" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "savingsGoalId" TEXT NOT NULL,
    "assetId" TEXT,
    "allocationBasisPoints" INTEGER NOT NULL DEFAULT 10000,

    CONSTRAINT "InvestmentGoalLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentTrade" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "direction" "InvestmentTradeDirection" NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "entryPriceCents" DECIMAL(30,8) NOT NULL,
    "exitDate" TIMESTAMP(3),
    "exitPriceCents" DECIMAL(30,8),
    "quantity" DECIMAL(30,12) NOT NULL,
    "feesCents" INTEGER NOT NULL DEFAULT 0,
    "taxesCents" INTEGER NOT NULL DEFAULT 0,
    "stopPriceCents" DECIMAL(30,8),
    "targetPriceCents" DECIMAL(30,8),
    "strategy" TEXT,
    "setup" TEXT,
    "notes" TEXT,
    "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "InvestmentTradeStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentTrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentPriceAlert" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetValue" DECIMAL(30,8) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentPriceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentMonthlyReview" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "portfolioUpdated" BOOLEAN NOT NULL DEFAULT false,
    "contributionsReviewed" BOOLEAN NOT NULL DEFAULT false,
    "allocationReviewed" BOOLEAN NOT NULL DEFAULT false,
    "maturitiesReviewed" BOOLEAN NOT NULL DEFAULT false,
    "goalsReviewed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentMonthlyReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestmentAccount_workspaceId_archivedAt_idx" ON "InvestmentAccount"("workspaceId", "archivedAt");

-- CreateIndex
CREATE INDEX "InvestmentAccount_workspaceId_institution_idx" ON "InvestmentAccount"("workspaceId", "institution");

-- CreateIndex
CREATE INDEX "InvestmentAsset_workspaceId_type_archivedAt_idx" ON "InvestmentAsset"("workspaceId", "type", "archivedAt");

-- CreateIndex
CREATE INDEX "InvestmentAsset_workspaceId_ticker_idx" ON "InvestmentAsset"("workspaceId", "ticker");

-- CreateIndex
CREATE INDEX "InvestmentAsset_provider_providerAssetId_idx" ON "InvestmentAsset"("provider", "providerAssetId");

-- CreateIndex
CREATE INDEX "InvestmentPosition_workspaceId_assetId_idx" ON "InvestmentPosition"("workspaceId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentPosition_accountId_assetId_key" ON "InvestmentPosition"("accountId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentTransaction_financeTransactionId_key" ON "InvestmentTransaction"("financeTransactionId");

-- CreateIndex
CREATE INDEX "InvestmentTransaction_workspaceId_date_idx" ON "InvestmentTransaction"("workspaceId", "date");

-- CreateIndex
CREATE INDEX "InvestmentTransaction_workspaceId_assetId_date_idx" ON "InvestmentTransaction"("workspaceId", "assetId", "date");

-- CreateIndex
CREATE INDEX "InvestmentTransaction_workspaceId_accountId_date_idx" ON "InvestmentTransaction"("workspaceId", "accountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentTransaction_workspaceId_externalId_key" ON "InvestmentTransaction"("workspaceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentIncome_financeTransactionId_key" ON "InvestmentIncome"("financeTransactionId");

-- CreateIndex
CREATE INDEX "InvestmentIncome_workspaceId_paymentDate_idx" ON "InvestmentIncome"("workspaceId", "paymentDate");

-- CreateIndex
CREATE INDEX "InvestmentIncome_workspaceId_assetId_paymentDate_idx" ON "InvestmentIncome"("workspaceId", "assetId", "paymentDate");

-- CreateIndex
CREATE INDEX "InvestmentPrice_assetId_asOf_idx" ON "InvestmentPrice"("assetId", "asOf");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentPrice_assetId_provider_asOf_key" ON "InvestmentPrice"("assetId", "provider", "asOf");

-- CreateIndex
CREATE INDEX "InvestmentProductDefinition_institution_product_validUntil_idx" ON "InvestmentProductDefinition"("institution", "product", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentProductDefinition_institution_product_validFrom_key" ON "InvestmentProductDefinition"("institution", "product", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentFixedIncomeProfile_assetId_key" ON "InvestmentFixedIncomeProfile"("assetId");

-- CreateIndex
CREATE INDEX "InvestmentFixedIncomeProfile_maturityDate_idx" ON "InvestmentFixedIncomeProfile"("maturityDate");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentRealEstateProfile_assetId_key" ON "InvestmentRealEstateProfile"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentBudget_workspaceId_month_key" ON "InvestmentBudget"("workspaceId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentAllocationTarget_workspaceId_assetType_key" ON "InvestmentAllocationTarget"("workspaceId", "assetType");

-- CreateIndex
CREATE INDEX "InvestmentPortfolioSnapshot_workspaceId_date_idx" ON "InvestmentPortfolioSnapshot"("workspaceId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentPortfolioSnapshot_workspaceId_date_key" ON "InvestmentPortfolioSnapshot"("workspaceId", "date");

-- CreateIndex
CREATE INDEX "InvestmentBenchmark_workspaceId_code_referenceDate_idx" ON "InvestmentBenchmark"("workspaceId", "code", "referenceDate");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentBenchmark_workspaceId_code_referenceDate_key" ON "InvestmentBenchmark"("workspaceId", "code", "referenceDate");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentWatchlist_workspaceId_name_key" ON "InvestmentWatchlist"("workspaceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentWatchlistItem_watchlistId_assetId_key" ON "InvestmentWatchlistItem"("watchlistId", "assetId");

-- CreateIndex
CREATE INDEX "InvestmentResearchNote_workspaceId_updatedAt_idx" ON "InvestmentResearchNote"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "InvestmentResearchNote_workspaceId_assetId_idx" ON "InvestmentResearchNote"("workspaceId", "assetId");

-- CreateIndex
CREATE INDEX "InvestmentMarketSnapshot_expiresAt_idx" ON "InvestmentMarketSnapshot"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentMarketSnapshot_key_provider_key" ON "InvestmentMarketSnapshot"("key", "provider");

-- CreateIndex
CREATE INDEX "InvestmentGoalLink_workspaceId_savingsGoalId_idx" ON "InvestmentGoalLink"("workspaceId", "savingsGoalId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentGoalLink_savingsGoalId_assetId_key" ON "InvestmentGoalLink"("savingsGoalId", "assetId");

-- CreateIndex
CREATE INDEX "InvestmentTrade_workspaceId_entryDate_idx" ON "InvestmentTrade"("workspaceId", "entryDate");

-- CreateIndex
CREATE INDEX "InvestmentTrade_workspaceId_status_idx" ON "InvestmentTrade"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "InvestmentTrade_assetId_entryDate_idx" ON "InvestmentTrade"("assetId", "entryDate");

-- CreateIndex
CREATE INDEX "InvestmentPriceAlert_workspaceId_enabled_idx" ON "InvestmentPriceAlert"("workspaceId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentMonthlyReview_workspaceId_month_key" ON "InvestmentMonthlyReview"("workspaceId", "month");

-- AddForeignKey
ALTER TABLE "InvestmentAccount" ADD CONSTRAINT "InvestmentAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentAccount" ADD CONSTRAINT "InvestmentAccount_linkedFinancialAccountId_fkey" FOREIGN KEY ("linkedFinancialAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentAsset" ADD CONSTRAINT "InvestmentAsset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentPosition" ADD CONSTRAINT "InvestmentPosition_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentPosition" ADD CONSTRAINT "InvestmentPosition_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "InvestmentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentPosition" ADD CONSTRAINT "InvestmentPosition_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "InvestmentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentTransaction" ADD CONSTRAINT "InvestmentTransaction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentTransaction" ADD CONSTRAINT "InvestmentTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "InvestmentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentTransaction" ADD CONSTRAINT "InvestmentTransaction_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "InvestmentAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentTransaction" ADD CONSTRAINT "InvestmentTransaction_financeTransactionId_fkey" FOREIGN KEY ("financeTransactionId") REFERENCES "FinanceTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentTransaction" ADD CONSTRAINT "InvestmentTransaction_fundingFinancialAccountId_fkey" FOREIGN KEY ("fundingFinancialAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentIncome" ADD CONSTRAINT "InvestmentIncome_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentIncome" ADD CONSTRAINT "InvestmentIncome_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "InvestmentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentIncome" ADD CONSTRAINT "InvestmentIncome_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "InvestmentAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentIncome" ADD CONSTRAINT "InvestmentIncome_financeTransactionId_fkey" FOREIGN KEY ("financeTransactionId") REFERENCES "FinanceTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentPrice" ADD CONSTRAINT "InvestmentPrice_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "InvestmentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentFixedIncomeProfile" ADD CONSTRAINT "InvestmentFixedIncomeProfile_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "InvestmentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentFixedIncomeProfile" ADD CONSTRAINT "InvestmentFixedIncomeProfile_productDefinitionId_fkey" FOREIGN KEY ("productDefinitionId") REFERENCES "InvestmentProductDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentRealEstateProfile" ADD CONSTRAINT "InvestmentRealEstateProfile_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "InvestmentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentBudget" ADD CONSTRAINT "InvestmentBudget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentAllocationTarget" ADD CONSTRAINT "InvestmentAllocationTarget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentPortfolioSnapshot" ADD CONSTRAINT "InvestmentPortfolioSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentBenchmark" ADD CONSTRAINT "InvestmentBenchmark_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentWatchlist" ADD CONSTRAINT "InvestmentWatchlist_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentWatchlistItem" ADD CONSTRAINT "InvestmentWatchlistItem_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "InvestmentWatchlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentWatchlistItem" ADD CONSTRAINT "InvestmentWatchlistItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "InvestmentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentResearchNote" ADD CONSTRAINT "InvestmentResearchNote_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentResearchNote" ADD CONSTRAINT "InvestmentResearchNote_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "InvestmentAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentGoalLink" ADD CONSTRAINT "InvestmentGoalLink_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentGoalLink" ADD CONSTRAINT "InvestmentGoalLink_savingsGoalId_fkey" FOREIGN KEY ("savingsGoalId") REFERENCES "SavingsGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentGoalLink" ADD CONSTRAINT "InvestmentGoalLink_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "InvestmentAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentTrade" ADD CONSTRAINT "InvestmentTrade_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentTrade" ADD CONSTRAINT "InvestmentTrade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "InvestmentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentTrade" ADD CONSTRAINT "InvestmentTrade_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "InvestmentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentPriceAlert" ADD CONSTRAINT "InvestmentPriceAlert_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentPriceAlert" ADD CONSTRAINT "InvestmentPriceAlert_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "InvestmentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentMonthlyReview" ADD CONSTRAINT "InvestmentMonthlyReview_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
