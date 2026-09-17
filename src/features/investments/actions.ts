"use server";

import { createHash } from "node:crypto";
import { Prisma, type InvestmentAssetType, type InvestmentTransactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy/requirePermission";
import { dateOnly, parseMoney } from "@/features/finance/money";
import { INVESTMENT_ASSET_TYPES } from "./asset-metadata";
import { calculateCostBasis, marketValueCents, parseQuantity } from "./calculations";
import { getCryptoProvider, getMacroProvider } from "./providers";
import { parseInvestmentCsv } from "./import-parser";

const text = (data: FormData, key: string) => String(data.get(key) || "").trim();
const optional = (data: FormData, key: string, max = 1_000) => z.string().max(max).parse(text(data, key)) || null;
const required = (data: FormData, key: string, label: string) => z.string().trim().min(1, `Informe ${label}.`).max(240).parse(text(data, key));
const cents = (data: FormData, key: string, allowZero = false) => {
  const value = parseMoney(text(data, key) || "0");
  if (!allowZero && value <= 0) throw new Error("O valor deve ser maior que zero.");
  return value;
};
const day = (data: FormData, key: string) => dateOnly(text(data, key));
const optionalDay = (data: FormData, key: string) => text(data, key) ? day(data, key) : null;
const integer = (data: FormData, key: string, fallback = 0) => text(data, key) ? z.coerce.number().int().parse(text(data, key)) : fallback;

function basisPoints(value: string) {
  if (!value.trim()) return null;
  const normalized = value.trim().replace("%", "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < -1_000 || parsed > 1_000) throw new Error("Percentual inválido.");
  return Math.round(parsed * 100);
}

function decimalMajorToCents(value: string) {
  const raw = value.trim().replace(/^R\$\s*/, "").replace(/\s/g, "");
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  if (!/^\d+(?:\.\d{1,10})?$/.test(normalized)) throw new Error("Preço inválido. Use até 10 casas decimais.");
  return new Prisma.Decimal(normalized).mul(100);
}

function fail(error: unknown) {
  if (error instanceof z.ZodError) return { error: error.issues[0]?.message || "Confira os campos." };
  if (error instanceof Prisma.PrismaClientKnownRequestError) return { error: error.code === "P2002" ? "Esse registro já existe." : "Não foi possível salvar o investimento." };
  return { error: error instanceof Error ? error.message : "Não foi possível concluir a operação." };
}

function refreshInvestments() {
  revalidatePath("/", "layout");
  revalidatePath("/finance/investments", "layout");
  revalidatePath("/finance");
  revalidatePath("/today");
  revalidatePath("/calendar");
  revalidatePath("/insights");
}

async function investmentAccountRef(workspaceId: string, id: string) {
  const account = await prisma.investmentAccount.findFirst({ where: { id, workspaceId, archivedAt: null }, include: { linkedFinancialAccount: true } });
  if (!account) throw new Error("Conta de investimento indisponível.");
  return account;
}

async function investmentAssetRef(workspaceId: string, id: string, requiredAsset = true) {
  if (!id && !requiredAsset) return null;
  const asset = await prisma.investmentAsset.findFirst({ where: { id, workspaceId, archivedAt: null } });
  if (!asset) throw new Error("Ativo indisponível.");
  return asset;
}

async function recalculatePosition(tx: Prisma.TransactionClient, workspaceId: string, accountId: string, assetId: string) {
  const events = await tx.investmentTransaction.findMany({ where: { workspaceId, accountId, assetId }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] });
  const state = calculateCostBasis(events.map((event) => ({ type: event.type, quantity: event.quantity?.toString(), grossAmountCents: event.grossAmountCents, feesCents: event.feesCents, taxesCents: event.taxesCents, netAmountCents: event.netAmountCents })));
  const price = await tx.investmentPrice.findFirst({ where: { assetId }, orderBy: { asOf: "desc" } });
  const currentValueCents = price ? marketValueCents(state.quantity, price.priceCents.toString()) : state.bookCostCents;
  return tx.investmentPosition.upsert({
    where: { accountId_assetId: { accountId, assetId } },
    create: { workspaceId, accountId, assetId, quantity: new Prisma.Decimal(state.quantity), bookCostCents: state.bookCostCents, averagePriceCents: new Prisma.Decimal(state.averagePriceCents), currentValueCents, realizedPnlCents: state.realizedPnlCents, lastValuedAt: price?.asOf },
    update: { quantity: new Prisma.Decimal(state.quantity), bookCostCents: state.bookCostCents, averagePriceCents: new Prisma.Decimal(state.averagePriceCents), currentValueCents, realizedPnlCents: state.realizedPnlCents, lastValuedAt: price?.asOf },
  });
}

async function evaluatePriceAlerts(tx: Prisma.TransactionClient, workspaceId: string, assetId: string, priceCents: Prisma.Decimal) {
  const [alerts, asset] = await Promise.all([tx.investmentPriceAlert.findMany({ where: { workspaceId, assetId, enabled: true } }), tx.investmentAsset.findUnique({ where: { id: assetId }, select: { name: true, ticker: true } })]);
  for (const alert of alerts) {
    const reached = alert.type === "ABOVE" ? priceCents.greaterThanOrEqualTo(alert.targetValue) : priceCents.lessThanOrEqualTo(alert.targetValue);
    if (reached) {
      const now = new Date();
      if (!alert.lastTriggeredAt || now.getTime() - alert.lastTriggeredAt.getTime() >= 86_400_000) await tx.notification.create({ data: { workspaceId, title: `Alerta atingido · ${asset?.ticker || asset?.name || "Ativo"}`, body: `${alert.type === "ABOVE" ? "Preço acima" : "Preço abaixo"} do alvo cadastrado. Atual: ${(priceCents.toNumber() / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`, href: "/finance/investments/watchlist" } });
      await tx.investmentPriceAlert.update({ where: { id: alert.id }, data: { lastTriggeredAt: now } });
    }
  }
}

async function snapshot(tx: Prisma.TransactionClient, workspaceId: string, date: Date) {
  const [positions, contributions, income] = await Promise.all([
    tx.investmentPosition.aggregate({ where: { workspaceId }, _sum: { bookCostCents: true, currentValueCents: true } }),
    tx.investmentTransaction.aggregate({ where: { workspaceId, type: { in: ["BUY", "DEPOSIT"] } }, _sum: { netAmountCents: true } }),
    tx.investmentIncome.aggregate({ where: { workspaceId }, _sum: { amountCents: true } }),
  ]);
  const snapshotDate = dateOnly(date.toISOString().slice(0, 10));
  await tx.investmentPortfolioSnapshot.upsert({
    where: { workspaceId_date: { workspaceId, date: snapshotDate } },
    create: { workspaceId, date: snapshotDate, investedCents: positions._sum.bookCostCents || 0, marketValueCents: positions._sum.currentValueCents || 0, cumulativeContributionsCents: contributions._sum.netAmountCents || 0, cumulativeIncomeCents: income._sum.amountCents || 0 },
    update: { investedCents: positions._sum.bookCostCents || 0, marketValueCents: positions._sum.currentValueCents || 0, cumulativeContributionsCents: contributions._sum.netAmountCents || 0, cumulativeIncomeCents: income._sum.amountCents || 0 },
  });
}

export async function saveInvestmentAccount(data: FormData) {
  const context = await requirePermission("WRITE");
  try {
    const linkedId = optional(data, "linkedFinancialAccountId", 100);
    if (linkedId) {
      const linked = await prisma.account.findFirst({ where: { id: linkedId, workspaceId: context.workspaceId, isArchived: false } });
      if (!linked) throw new Error("Conta financeira vinculada não encontrada.");
    }
    await prisma.$transaction(async (tx) => {
      const item = await tx.investmentAccount.create({ data: { workspaceId: context.workspaceId, name: required(data, "name", "o nome"), institution: optional(data, "institution", 160), type: z.enum(["BROKERAGE", "BANK", "EXCHANGE", "WALLET", "REAL_ESTATE", "CUSTODY", "OTHER"]).parse(text(data, "type") || "BROKERAGE"), currency: text(data, "currency") || "BRL", linkedFinancialAccountId: linkedId } });
      await tx.activityEvent.create({ data: { workspaceId: context.workspaceId, actorUserId: context.userId, type: "investment.account_created", entityType: "InvestmentAccount", entityId: item.id, metadata: { institution: item.institution, type: item.type } } });
    });
    refreshInvestments(); return { success: "Conta de investimento criada." };
  } catch (error) { return fail(error); }
}

const fixedTypes: InvestmentAssetType[] = ["CASH_EQUIVALENT", "SAVINGS", "CDB", "LCI", "LCA", "TREASURY", "DEBENTURE", "FIXED_INCOME_OTHER"];

export async function saveInvestmentAsset(data: FormData) {
  const context = await requirePermission("WRITE");
  try {
    const type = z.enum(INVESTMENT_ASSET_TYPES as [InvestmentAssetType, ...InvestmentAssetType[]]).parse(text(data, "type"));
    const asset = await prisma.$transaction(async (tx) => {
      const created = await tx.investmentAsset.create({ data: { workspaceId: context.workspaceId, name: required(data, "name", "o nome do ativo"), ticker: optional(data, "ticker", 30)?.toUpperCase() || null, exchange: optional(data, "exchange", 50), currency: text(data, "currency") || "BRL", type, sector: optional(data, "sector", 120), provider: optional(data, "provider", 80), providerAssetId: optional(data, "providerAssetId", 120), isManual: !text(data, "providerAssetId") } });
      if (fixedTypes.includes(type) && text(data, "principal")) {
        await tx.investmentFixedIncomeProfile.create({ data: { assetId: created.id, productDefinitionId: optional(data, "productDefinitionId", 100), issuer: required(data, "issuer", "o emissor"), principalCents: cents(data, "principal"), purchaseDate: day(data, "purchaseDate"), maturityDate: optionalDay(data, "maturityDate"), indexer: z.enum(["CDI_PERCENTAGE", "CDI_SPREAD", "PREFIXED", "IPCA_SPREAD", "SELIC", "CUSTOM"]).parse(text(data, "indexer") || "CDI_PERCENTAGE"), indexerPercentageBasisPoints: basisPoints(text(data, "indexerPercentage")), spreadBasisPoints: basisPoints(text(data, "spread")), fixedRateBasisPoints: basisPoints(text(data, "fixedRate")), liquidity: z.enum(["D0", "D1", "DN", "AT_MATURITY", "CUSTOM", "ILLIQUID"]).parse(text(data, "liquidity") || "AT_MATURITY"), liquidityDays: integer(data, "liquidityDays") || null, taxTreatment: text(data, "taxTreatment") || "REGRESSIVE_IR", guaranteeMetadata: { fgc: text(data, "fgc") === "on" }, markToMarket: text(data, "markToMarket") === "on" } });
      }
      if (type === "REAL_ESTATE" && text(data, "purchasePrice")) {
        await tx.investmentRealEstateProfile.create({ data: { assetId: created.id, purchasePriceCents: cents(data, "purchasePrice"), purchaseDate: day(data, "purchaseDate"), estimatedValueCents: cents(data, "estimatedValue"), valuationDate: day(data, "valuationDate"), monthlyRentCents: cents(data, "monthlyRent", true), financingBalanceCents: cents(data, "financingBalance", true), monthlyCostsCents: cents(data, "monthlyCosts", true), vacancyBasisPoints: basisPoints(text(data, "vacancy")) || 0, propertyType: text(data, "propertyType") || "PROPERTY" } });
      }
      await tx.activityEvent.create({ data: { workspaceId: context.workspaceId, actorUserId: context.userId, type: "investment.asset_created", entityType: "InvestmentAsset", entityId: created.id, metadata: { type: created.type, ticker: created.ticker } } });
      return created;
    });
    refreshInvestments(); return { success: `${asset.ticker || asset.name} adicionado à biblioteca de ativos.` };
  } catch (error) { return fail(error); }
}

export async function saveInvestmentTransaction(data: FormData) {
  const context = await requirePermission("WRITE");
  try {
    const account = await investmentAccountRef(context.workspaceId, text(data, "accountId"));
    const type = z.enum(["BUY", "SELL", "DEPOSIT", "WITHDRAWAL", "DIVIDEND", "INTEREST", "FEE", "TAX", "TRANSFER", "SPLIT", "OTHER"]).parse(text(data, "type") || "BUY") as InvestmentTransactionType;
    const asset = await investmentAssetRef(context.workspaceId, text(data, "assetId"), !["DEPOSIT", "WITHDRAWAL", "FEE", "TAX"].includes(type));
    const quantityText = text(data, "quantity");
    if (["BUY", "SELL", "SPLIT"].includes(type)) parseQuantity(quantityText);
    const grossAmountCents = type === "SPLIT" ? 0 : cents(data, "amount", ["FEE", "TAX"].includes(type));
    const feesCents = cents(data, "fees", true);
    const taxesCents = cents(data, "taxes", true);
    const netAmountCents = type === "SELL" ? grossAmountCents - feesCents - taxesCents : grossAmountCents + feesCents + taxesCents;
    const operationDate = day(data, "date");
    const fundingId = optional(data, "fundingFinancialAccountId", 100);
    const settlementId = optional(data, "settlementFinancialAccountId", 100);

    await prisma.$transaction(async (tx) => {
      let financeTransactionId: string | null = null;
      if (fundingId && account.linkedFinancialAccountId && ["BUY", "DEPOSIT"].includes(type)) {
        const funding = await tx.account.findFirst({ where: { id: fundingId, workspaceId: context.workspaceId, isArchived: false } });
        if (!funding) throw new Error("Conta de origem do aporte não encontrada.");
        if (funding.id === account.linkedFinancialAccountId) throw new Error("Origem e destino do aporte devem ser diferentes.");
        const finance = await tx.financeTransaction.create({ data: { workspaceId: context.workspaceId, accountId: funding.id, destinationAccountId: account.linkedFinancialAccountId, type: "TRANSFER", description: `Aporte · ${asset?.ticker || asset?.name || account.name}`, amountCents: grossAmountCents, currency: account.currency, date: operationDate, source: "INVESTMENTS", tags: ["investimento:tbb"] } });
        financeTransactionId = finance.id;
      }
      if (settlementId && account.linkedFinancialAccountId && ["SELL", "WITHDRAWAL"].includes(type)) {
        const settlement = await tx.account.findFirst({ where: { id: settlementId, workspaceId: context.workspaceId, isArchived: false } });
        if (!settlement) throw new Error("Conta de destino do resgate não encontrada.");
        if (settlement.id === account.linkedFinancialAccountId) throw new Error("Origem e destino do resgate devem ser diferentes.");
        const finance = await tx.financeTransaction.create({ data: { workspaceId: context.workspaceId, accountId: account.linkedFinancialAccountId, destinationAccountId: settlement.id, type: "TRANSFER", description: `Resgate · ${asset?.ticker || asset?.name || account.name}`, amountCents: Math.max(0, netAmountCents), currency: account.currency, date: operationDate, source: "INVESTMENTS", tags: ["resgate-investimento:tbb"] } });
        financeTransactionId = finance.id;
      }
      const created = await tx.investmentTransaction.create({ data: { workspaceId: context.workspaceId, accountId: account.id, assetId: asset?.id, type, date: operationDate, quantity: quantityText ? new Prisma.Decimal(quantityText.replace(",", ".")) : null, unitPriceCents: text(data, "unitPrice") ? decimalMajorToCents(text(data, "unitPrice")) : null, grossAmountCents, feesCents, taxesCents, netAmountCents, currency: account.currency, source: "MANUAL", financeTransactionId, fundingFinancialAccountId: fundingId, notes: optional(data, "notes", 2_000) } });
      if (asset) await recalculatePosition(tx, context.workspaceId, account.id, asset.id);
      await snapshot(tx, context.workspaceId, operationDate);
      await tx.activityEvent.create({ data: { workspaceId: context.workspaceId, actorUserId: context.userId, type: "investment.transaction_created", entityType: "InvestmentTransaction", entityId: created.id, metadata: { type, assetId: asset?.id, amountCents: grossAmountCents, financeTransactionId } } });
    });
    refreshInvestments(); return { success: type === "BUY" ? "Aporte registrado e posição recalculada." : "Operação registrada e posição recalculada." };
  } catch (error) { return fail(error); }
}

export async function saveInvestmentIncome(data: FormData) {
  const context = await requirePermission("WRITE");
  try {
    const account = await investmentAccountRef(context.workspaceId, text(data, "accountId"));
    const asset = await investmentAssetRef(context.workspaceId, text(data, "assetId"), false);
    const amountCents = cents(data, "amount");
    const paymentDate = day(data, "paymentDate");
    await prisma.$transaction(async (tx) => {
      let financeTransactionId: string | null = null;
      if (text(data, "postToFinance") === "on" && account.linkedFinancialAccountId) {
        const finance = await tx.financeTransaction.create({ data: { workspaceId: context.workspaceId, accountId: account.linkedFinancialAccountId, type: "INCOME", description: `${text(data, "type") === "RENT" ? "Aluguel" : "Rendimento"} · ${asset?.ticker || asset?.name || account.name}`, amountCents, currency: account.currency, date: paymentDate, source: "INVESTMENTS", tags: ["renda-investimento:tbb"] } });
        financeTransactionId = finance.id;
      }
      const created = await tx.investmentIncome.create({ data: { workspaceId: context.workspaceId, accountId: account.id, assetId: asset?.id, type: z.enum(["DIVIDEND", "JCP", "FII_DISTRIBUTION", "INTEREST", "COUPON", "RENT", "OTHER"]).parse(text(data, "type")), amountCents, currency: account.currency, paymentDate, financeTransactionId, notes: optional(data, "notes", 2_000) } });
      await snapshot(tx, context.workspaceId, paymentDate);
      await tx.activityEvent.create({ data: { workspaceId: context.workspaceId, actorUserId: context.userId, type: "investment.income_created", entityType: "InvestmentIncome", entityId: created.id, metadata: { amountCents, financeTransactionId } } });
    });
    refreshInvestments(); return { success: "Rendimento registrado." };
  } catch (error) { return fail(error); }
}

export async function saveManualInvestmentPrice(data: FormData) {
  const context = await requirePermission("WRITE");
  try {
    const asset = await investmentAssetRef(context.workspaceId, text(data, "assetId"));
    const asOf = new Date(`${text(data, "asOf")}T12:00:00.000Z`);
    if (!Number.isFinite(asOf.valueOf())) throw new Error("Data da cotação inválida.");
    await prisma.$transaction(async (tx) => {
      const price = await tx.investmentPrice.create({ data: { assetId: asset!.id, priceCents: decimalMajorToCents(text(data, "price")), currency: asset!.currency, provider: "MANUAL", asOf } });
      const positions = await tx.investmentPosition.findMany({ where: { workspaceId: context.workspaceId, assetId: asset!.id } });
      for (const position of positions) await tx.investmentPosition.update({ where: { id: position.id }, data: { currentValueCents: marketValueCents(position.quantity.toString(), price.priceCents.toString()), lastValuedAt: asOf } });
      await evaluatePriceAlerts(tx, context.workspaceId, asset!.id, price.priceCents);
      await snapshot(tx, context.workspaceId, asOf);
    });
    refreshInvestments(); return { success: "Cotação manual atualizada com data de referência." };
  } catch (error) { return fail(error); }
}

export async function refreshInvestmentMarketData() {
  const context = await requirePermission("WRITE");
  try {
    const assets = await prisma.investmentAsset.findMany({ where: { workspaceId: context.workspaceId, archivedAt: null, provider: "COINGECKO", providerAssetId: { not: null } } });
    const [quotes, macro] = await Promise.all([
      getCryptoProvider().getQuotes(assets.map((asset) => asset.providerAssetId!)),
      getMacroProvider().getIndicators(),
    ]);
    const quoteByProviderId = new Map(quotes.map((quote) => [quote.code, quote]));
    await prisma.$transaction(async (tx) => {
      for (const asset of assets) {
        const quote = quoteByProviderId.get(asset.providerAssetId!);
        if (!quote) continue;
        const priceCents = new Prisma.Decimal(quote.value).mul(100);
        const asOf = new Date(quote.asOf);
        await tx.investmentPrice.upsert({ where: { assetId_provider_asOf: { assetId: asset.id, provider: quote.source, asOf } }, create: { assetId: asset.id, priceCents, currency: quote.currency || "BRL", provider: quote.source, asOf, retrievedAt: new Date(quote.retrievedAt), delayMinutes: quote.delayMinutes }, update: { priceCents, retrievedAt: new Date(quote.retrievedAt), delayMinutes: quote.delayMinutes } });
        const positions = await tx.investmentPosition.findMany({ where: { workspaceId: context.workspaceId, assetId: asset.id } });
        for (const position of positions) await tx.investmentPosition.update({ where: { id: position.id }, data: { currentValueCents: marketValueCents(position.quantity.toString(), priceCents.toString()), lastValuedAt: asOf } });
        await evaluatePriceAlerts(tx, context.workspaceId, asset.id, priceCents);
      }
      for (const item of macro) {
        const referenceDate = dateOnly(item.asOf.slice(0, 10));
        await tx.investmentBenchmark.upsert({ where: { workspaceId_code_referenceDate: { workspaceId: context.workspaceId, code: item.code, referenceDate } }, create: { workspaceId: context.workspaceId, code: item.code, value: new Prisma.Decimal(item.value), referenceDate, source: item.source, retrievedAt: new Date(item.retrievedAt), metadata: { unit: item.unit, sourceUrl: item.sourceUrl, freshness: item.freshness } }, update: { value: new Prisma.Decimal(item.value), source: item.source, retrievedAt: new Date(item.retrievedAt), metadata: { unit: item.unit, sourceUrl: item.sourceUrl, freshness: item.freshness } } });
      }
      await snapshot(tx, context.workspaceId, new Date());
    });
    refreshInvestments();
    return { success: `${quotes.length} cotação(ões) e ${macro.length} indicador(es) atualizados.` };
  } catch (error) { return fail(error); }
}

export async function saveInvestmentBudget(data: FormData) {
  const context = await requirePermission("WRITE");
  try {
    const month = z.string().regex(/^\d{4}-\d{2}$/).parse(text(data, "month"));
    const mode = z.enum(["FIXED_AMOUNT", "INCOME_PERCENTAGE", "MANUAL", "REMAINING_CASH"]).parse(text(data, "mode"));
    const plan = Object.fromEntries([...data.entries()].filter(([key]) => key.startsWith("plan:")).map(([key, value]) => [key.slice(5), parseMoney(String(value) || "0")]));
    await prisma.investmentBudget.upsert({ where: { workspaceId_month: { workspaceId: context.workspaceId, month } }, create: { workspaceId: context.workspaceId, month, mode, amountCents: cents(data, "amount", true), incomePercentageBasisPoints: basisPoints(text(data, "incomePercentage")), reserveCents: cents(data, "reserve", true), plan }, update: { mode, amountCents: cents(data, "amount", true), incomePercentageBasisPoints: basisPoints(text(data, "incomePercentage")), reserveCents: cents(data, "reserve", true), plan } });
    refreshInvestments(); return { success: "Verba mensal de investimentos atualizada." };
  } catch (error) { return fail(error); }
}

export async function saveAllocationTargets(data: FormData) {
  const context = await requirePermission("WRITE");
  try {
    const targets = INVESTMENT_ASSET_TYPES.map((type) => ({ type, value: basisPoints(text(data, `target:${type}`)) || 0 })).filter((item) => item.value > 0);
    const total = targets.reduce((sum, item) => sum + item.value, 0);
    if (total !== 10_000) throw new Error("A alocação alvo precisa somar 100%." );
    await prisma.$transaction(async (tx) => {
      await tx.investmentAllocationTarget.deleteMany({ where: { workspaceId: context.workspaceId } });
      await tx.investmentAllocationTarget.createMany({ data: targets.map((item) => ({ workspaceId: context.workspaceId, assetType: item.type, targetBasisPoints: item.value })) });
    });
    refreshInvestments(); return { success: "Alocação alvo atualizada." };
  } catch (error) { return fail(error); }
}

export async function saveInvestmentWatchlist(data: FormData) {
  const context = await requirePermission("WRITE");
  try { await prisma.investmentWatchlist.create({ data: { workspaceId: context.workspaceId, name: required(data, "name", "o nome da lista") } }); refreshInvestments(); return { success: "Lista criada." }; } catch (error) { return fail(error); }
}

export async function addInvestmentWatchlistItem(data: FormData) {
  const context = await requirePermission("WRITE");
  try {
    const list = await prisma.investmentWatchlist.findFirst({ where: { id: text(data, "watchlistId"), workspaceId: context.workspaceId } });
    const asset = await investmentAssetRef(context.workspaceId, text(data, "assetId"));
    if (!list) throw new Error("Lista não encontrada.");
    await prisma.investmentWatchlistItem.create({ data: { watchlistId: list.id, assetId: asset!.id, targetPriceCents: text(data, "targetPrice") ? decimalMajorToCents(text(data, "targetPrice")) : null, notes: optional(data, "notes", 500) } });
    refreshInvestments(); return { success: "Ativo adicionado à lista." };
  } catch (error) { return fail(error); }
}

export async function saveInvestmentPriceAlert(data: FormData) {
  const context = await requirePermission("WRITE");
  try {
    const asset = await investmentAssetRef(context.workspaceId, text(data, "assetId"));
    const type = z.enum(["ABOVE", "BELOW"]).parse(text(data, "type") || "ABOVE");
    await prisma.investmentPriceAlert.create({ data: { workspaceId: context.workspaceId, assetId: asset!.id, type, targetValue: decimalMajorToCents(text(data, "targetValue")) } });
    refreshInvestments(); return { success: "Alerta de preço criado." };
  } catch (error) { return fail(error); }
}

export async function saveInvestmentGoalLink(data: FormData) {
  const context = await requirePermission("WRITE");
  try {
    const goal = await prisma.savingsGoal.findFirst({ where: { id: text(data, "savingsGoalId"), workspaceId: context.workspaceId } });
    if (!goal) throw new Error("Meta financeira não encontrada.");
    const asset = await investmentAssetRef(context.workspaceId, text(data, "assetId"), false);
    const allocation = basisPoints(text(data, "allocation")) || 10_000;
    if (allocation <= 0 || allocation > 10_000) throw new Error("A alocação da meta deve ficar entre 0% e 100%.");
    await prisma.$transaction(async (tx) => {
      await tx.investmentGoalLink.deleteMany({ where: { workspaceId: context.workspaceId, savingsGoalId: goal.id, assetId: asset?.id || null } });
      await tx.investmentGoalLink.create({ data: { workspaceId: context.workspaceId, savingsGoalId: goal.id, assetId: asset?.id || null, allocationBasisPoints: allocation } });
    });
    refreshInvestments(); return { success: "Meta conectada à carteira." };
  } catch (error) { return fail(error); }
}

export async function importInvestmentCsv(data: FormData) {
  const context = await requirePermission("WRITE");
  try {
    const content = text(data, "content");
    if (!content || Buffer.byteLength(content, "utf8") > 5_000_000) throw new Error("Envie um CSV UTF-8 de até 5 MB.");
    const rows = parseInvestmentCsv(content);
    const defaultAccountId = optional(data, "accountId", 100);
    const defaultAssetType = z.enum(INVESTMENT_ASSET_TYPES as [InvestmentAssetType, ...InvestmentAssetType[]]).parse(text(data, "defaultAssetType") || "STOCK");
    const batchId = `investment-csv-${createHash("sha256").update(`${context.workspaceId}:${Date.now()}:${content.length}`).digest("hex").slice(0, 16)}`;
    const result = await prisma.$transaction(async (tx) => {
      let imported = 0, duplicates = 0;
      const affected = new Map<string, { accountId: string; assetId: string }>();
      for (const row of rows) {
        let account = defaultAccountId ? await tx.investmentAccount.findFirst({ where: { id: defaultAccountId, workspaceId: context.workspaceId, archivedAt: null } }) : null;
        if (!account && row.institution) account = await tx.investmentAccount.findFirst({ where: { workspaceId: context.workspaceId, archivedAt: null, OR: [{ name: { equals: row.institution, mode: "insensitive" } }, { institution: { equals: row.institution, mode: "insensitive" } }] } });
        if (!account) account = await tx.investmentAccount.create({ data: { workspaceId: context.workspaceId, name: row.institution || "Carteira importada", institution: row.institution || null, type: "BROKERAGE" } });
        let asset = await tx.investmentAsset.findFirst({ where: { workspaceId: context.workspaceId, archivedAt: null, ticker: { equals: row.ticker, mode: "insensitive" } } });
        if (!asset) asset = await tx.investmentAsset.create({ data: { workspaceId: context.workspaceId, name: row.name, ticker: row.ticker, type: defaultAssetType, isManual: true } });
        const identity = row.externalId || createHash("sha256").update([account.id, asset.id, row.date, row.type, row.quantity, row.grossAmountCents].join(":"), "utf8").digest("hex");
        const externalId = `INVCSV:${identity}`.slice(0, 190);
        const exists = await tx.investmentTransaction.findFirst({ where: { workspaceId: context.workspaceId, externalId } });
        if (exists) { duplicates += 1; continue; }
        const netAmountCents = row.type === "SELL" ? row.grossAmountCents - row.feesCents - row.taxesCents : row.grossAmountCents + row.feesCents + row.taxesCents;
        await tx.investmentTransaction.create({ data: { workspaceId: context.workspaceId, accountId: account.id, assetId: asset.id, type: row.type, date: dateOnly(row.date), quantity: new Prisma.Decimal(row.quantity), unitPriceCents: row.unitPriceCents, grossAmountCents: row.grossAmountCents, feesCents: row.feesCents, taxesCents: row.taxesCents, netAmountCents, currency: asset.currency, source: "CSV", externalId, importBatchId: batchId } });
        affected.set(`${account.id}:${asset.id}`, { accountId: account.id, assetId: asset.id });
        imported += 1;
      }
      for (const item of affected.values()) await recalculatePosition(tx, context.workspaceId, item.accountId, item.assetId);
      await snapshot(tx, context.workspaceId, dateOnly(rows.at(-1)?.date || new Date().toISOString().slice(0, 10)));
      await tx.activityEvent.create({ data: { workspaceId: context.workspaceId, actorUserId: context.userId, type: "investment.csv_imported", entityType: "InvestmentTransaction", entityId: batchId, metadata: { imported, duplicates, rows: rows.length } } });
      return { imported, duplicates };
    }, { timeout: 30_000 });
    refreshInvestments();
    return { success: `${result.imported} operação(ões) importada(s). ${result.duplicates} duplicada(s) ignorada(s).` };
  } catch (error) { return fail(error); }
}

export async function saveInvestmentResearchNote(data: FormData) {
  const context = await requirePermission("WRITE");
  try {
    const asset = await investmentAssetRef(context.workspaceId, text(data, "assetId"), false);
    await prisma.investmentResearchNote.create({ data: { workspaceId: context.workspaceId, assetId: asset?.id, title: required(data, "title", "o título"), content: required(data, "content", "a nota"), tags: text(data, "tags").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20), sources: [] } });
    refreshInvestments(); return { success: "Nota de pesquisa salva." };
  } catch (error) { return fail(error); }
}

export async function saveInvestmentTrade(data: FormData) {
  const context = await requirePermission("WRITE");
  try {
    const account = await investmentAccountRef(context.workspaceId, text(data, "accountId"));
    const asset = await investmentAssetRef(context.workspaceId, text(data, "assetId"));
    parseQuantity(text(data, "quantity"));
    await prisma.investmentTrade.create({ data: { workspaceId: context.workspaceId, accountId: account.id, assetId: asset!.id, direction: z.enum(["LONG", "SHORT"]).parse(text(data, "direction")), entryDate: new Date(text(data, "entryDate")), entryPriceCents: decimalMajorToCents(text(data, "entryPrice")), exitDate: text(data, "exitDate") ? new Date(text(data, "exitDate")) : null, exitPriceCents: text(data, "exitPrice") ? decimalMajorToCents(text(data, "exitPrice")) : null, quantity: new Prisma.Decimal(text(data, "quantity").replace(",", ".")), feesCents: cents(data, "fees", true), taxesCents: cents(data, "taxes", true), stopPriceCents: text(data, "stopPrice") ? decimalMajorToCents(text(data, "stopPrice")) : null, targetPriceCents: text(data, "targetPrice") ? decimalMajorToCents(text(data, "targetPrice")) : null, strategy: optional(data, "strategy", 120), setup: optional(data, "setup", 200), notes: optional(data, "notes", 3_000), status: text(data, "exitDate") ? "CLOSED" : "OPEN" } });
    refreshInvestments(); return { success: "Trade registrado no journal." };
  } catch (error) { return fail(error); }
}

export async function saveInvestmentProductDefinition(data: FormData) {
  await requirePermission("WRITE");
  try {
    await prisma.investmentProductDefinition.create({ data: { institution: required(data, "institution", "a instituição"), product: required(data, "product", "o produto"), assetType: z.enum(INVESTMENT_ASSET_TYPES as [InvestmentAssetType, ...InvestmentAssetType[]]).parse(text(data, "assetType")), indexer: z.enum(["CDI_PERCENTAGE", "CDI_SPREAD", "PREFIXED", "IPCA_SPREAD", "SELIC", "CUSTOM"]).parse(text(data, "indexer")), indexerPercentageBasisPoints: basisPoints(text(data, "indexerPercentage")), spreadBasisPoints: basisPoints(text(data, "spread")), fixedRateBasisPoints: basisPoints(text(data, "fixedRate")), eligibility: optional(data, "eligibility", 1_000), eligibleLimitCents: text(data, "eligibleLimit") ? cents(data, "eligibleLimit") : null, liquidity: text(data, "liquidity") ? z.enum(["D0", "D1", "DN", "AT_MATURITY", "CUSTOM", "ILLIQUID"]).parse(text(data, "liquidity")) : null, validFrom: day(data, "validFrom"), validUntil: optionalDay(data, "validUntil"), source: z.string().url("Informe a URL da fonte.").parse(text(data, "source")), lastVerifiedAt: new Date() } });
    refreshInvestments(); return { success: "Nova versão do produto registrada sem alterar o histórico." };
  } catch (error) { return fail(error); }
}

export async function updateInvestmentReview(data: FormData) {
  const context = await requirePermission("WRITE");
  try {
    const month = z.string().regex(/^\d{4}-\d{2}$/).parse(text(data, "month"));
    const values = { portfolioUpdated: text(data, "portfolioUpdated") === "on", contributionsReviewed: text(data, "contributionsReviewed") === "on", allocationReviewed: text(data, "allocationReviewed") === "on", maturitiesReviewed: text(data, "maturitiesReviewed") === "on", goalsReviewed: text(data, "goalsReviewed") === "on" };
    const complete = Object.values(values).every(Boolean);
    await prisma.investmentMonthlyReview.upsert({ where: { workspaceId_month: { workspaceId: context.workspaceId, month } }, create: { workspaceId: context.workspaceId, month, ...values, completedAt: complete ? new Date() : null }, update: { ...values, completedAt: complete ? new Date() : null } });
    refreshInvestments(); return { success: complete ? "Revisão mensal concluída." : "Revisão mensal atualizada." };
  } catch (error) { return fail(error); }
}
