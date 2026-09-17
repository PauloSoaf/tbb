import { Prisma, type InvestmentAssetType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assetGroup, INVESTMENT_ASSET_METADATA, INVESTMENT_GROUP_LABELS, type InvestmentAssetGroup } from "./asset-metadata";
import { allocationBreakdown, marketValueCents, realEstateMetrics, tradingMetrics } from "./calculations";
import { ensureDefaultInvestmentProducts } from "./product-catalog";
import { getCryptoProvider, getMacroProvider, type MarketQuote } from "./providers";

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const monthKey = (date: Date) => date.toISOString().slice(0, 7);
const number = (value: Prisma.Decimal | number | string | null | undefined) => value === null || value === undefined ? 0 : Number(value);

function startOfMonth(day: string) {
  return new Date(`${day.slice(0, 7)}-01T00:00:00.000Z`);
}

function priorMonth(day: string) {
  const date = startOfMonth(day);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}

function positionLiquidity(type: InvestmentAssetType, liquidity?: string | null) {
  if (liquidity === "D0" || liquidity === "D1") return "LIQUID";
  if (liquidity === "ILLIQUID") return "ILLIQUID";
  return INVESTMENT_ASSET_METADATA[type].defaultLiquidity;
}

export async function investmentShellData(workspaceId: string) {
  await ensureDefaultInvestmentProducts();
  const [accounts, assets, financeAccounts, products] = await Promise.all([
    prisma.investmentAccount.findMany({ where: { workspaceId, archivedAt: null }, orderBy: [{ institution: "asc" }, { name: "asc" }] }),
    prisma.investmentAsset.findMany({ where: { workspaceId, archivedAt: null }, orderBy: [{ ticker: "asc" }, { name: "asc" }] }),
    prisma.account.findMany({ where: { workspaceId, isArchived: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.investmentProductDefinition.findMany({ where: { OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] }, orderBy: [{ institution: "asc" }, { product: "asc" }] }),
  ]);
  return {
    accounts: accounts.map(({ id, name, institution, linkedFinancialAccountId }) => ({ id, name, institution, linkedFinancialAccountId })),
    assets: assets.map(({ id, name, ticker, type }) => ({ id, name, ticker, type })),
    financeAccounts,
    products: products.map(({ id, institution, product, indexerPercentageBasisPoints }) => ({ id, institution, product, indexerPercentageBasisPoints })),
  };
}

async function marketQuotes(providerAssets: { id: string; providerAssetId: string }[]) {
  const output = new Map<string, MarketQuote>();
  if (!providerAssets.length) return output;
  try {
    const quotes = await getCryptoProvider().getQuotes(providerAssets.map((item) => item.providerAssetId));
    const byProviderId = new Map(quotes.map((quote) => [quote.code, quote]));
    for (const item of providerAssets) {
      const quote = byProviderId.get(item.providerAssetId);
      if (quote) output.set(item.id, quote);
    }
  } catch {
    // A carteira manual e o último preço persistido continuam disponíveis.
  }
  return output;
}

export async function investmentOverview(workspaceId: string, today: string) {
  await ensureDefaultInvestmentProducts();
  const month = today.slice(0, 7);
  const monthStart = startOfMonth(today);
  const nextMonth = new Date(monthStart);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const historyStart = new Date(monthStart);
  historyStart.setUTCMonth(historyStart.getUTCMonth() - 11);

  const [positionsRaw, accountsRaw, assetsRaw, transactionsRaw, incomesRaw, snapshotsRaw, targetsRaw, budgetRaw, latestPrices, reviewsRaw, notesRaw, watchlistsRaw, tradesRaw, productsRaw, goalsRaw, alertsRaw] = await Promise.all([
    prisma.investmentPosition.findMany({
      where: { workspaceId, asset: { archivedAt: null }, account: { archivedAt: null } },
      include: { account: true, asset: { include: { fixedIncomeProfile: true, realEstateProfile: true } } },
      orderBy: { currentValueCents: "desc" },
    }),
    prisma.investmentAccount.findMany({ where: { workspaceId, archivedAt: null }, include: { linkedFinancialAccount: { select: { id: true, name: true } } }, orderBy: { name: "asc" } }),
    prisma.investmentAsset.findMany({ where: { workspaceId, archivedAt: null }, include: { fixedIncomeProfile: true, realEstateProfile: true }, orderBy: { name: "asc" } }),
    prisma.investmentTransaction.findMany({ where: { workspaceId }, include: { account: { select: { name: true } }, asset: { select: { name: true, ticker: true, type: true } } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 80 }),
    prisma.investmentIncome.findMany({ where: { workspaceId }, include: { account: { select: { name: true } }, asset: { select: { name: true, ticker: true, type: true } } }, orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }], take: 80 }),
    prisma.investmentPortfolioSnapshot.findMany({ where: { workspaceId, date: { gte: historyStart } }, orderBy: { date: "asc" } }),
    prisma.investmentAllocationTarget.findMany({ where: { workspaceId } }),
    prisma.investmentBudget.findUnique({ where: { workspaceId_month: { workspaceId, month } } }),
    prisma.investmentPrice.findMany({ where: { asset: { workspaceId } }, orderBy: { asOf: "desc" }, distinct: ["assetId"] }),
    prisma.investmentMonthlyReview.findMany({ where: { workspaceId }, orderBy: { month: "desc" }, take: 6 }),
    prisma.investmentResearchNote.findMany({ where: { workspaceId }, include: { asset: { select: { name: true, ticker: true } } }, orderBy: { updatedAt: "desc" }, take: 8 }),
    prisma.investmentWatchlist.findMany({ where: { workspaceId }, include: { items: { include: { asset: true } } }, orderBy: { updatedAt: "desc" } }),
    prisma.investmentTrade.findMany({ where: { workspaceId }, include: { account: { select: { name: true } }, asset: { select: { name: true, ticker: true } } }, orderBy: { entryDate: "desc" }, take: 100 }),
    prisma.investmentProductDefinition.findMany({ where: { OR: [{ validUntil: null }, { validUntil: { gte: new Date(`${today}T00:00:00.000Z`) } }] }, orderBy: [{ institution: "asc" }, { product: "asc" }] }),
    prisma.savingsGoal.findMany({ where: { workspaceId }, include: { investmentLinks: { include: { asset: { select: { name: true, ticker: true } } } } }, orderBy: { targetDate: "asc" } }),
    prisma.investmentPriceAlert.findMany({ where: { workspaceId, enabled: true }, include: { asset: { select: { id: true, name: true, ticker: true, type: true } } }, orderBy: { createdAt: "desc" } }),
  ]);

  const providerAssets = assetsRaw.filter((asset) => asset.provider === "COINGECKO" && asset.providerAssetId).map((asset) => ({ id: asset.id, providerAssetId: asset.providerAssetId! }));
  const macroProvider = getMacroProvider();
  const [liveQuotes, macro, benchmarkHistory] = await Promise.all([
    marketQuotes(providerAssets),
    macroProvider.getIndicators().catch(() => [] as MarketQuote[]),
    macroProvider.getHistory ? macroProvider.getHistory("SELIC", historyStart, new Date(`${today}T23:59:59.999Z`)).catch(() => []) : Promise.resolve([]),
  ]);
  const priceByAsset = new Map(latestPrices.map((price) => [price.assetId, price]));

  const positions = positionsRaw.map((position) => {
    const quote = liveQuotes.get(position.assetId);
    const persisted = priceByAsset.get(position.assetId);
    const currentPriceCents = quote ? new Prisma.Decimal(quote.value).mul(100).toString() : persisted?.priceCents.toString() || position.averagePriceCents.toString();
    const quotedValue = (quote || persisted) ? marketValueCents(position.quantity.toString(), currentPriceCents) : position.currentValueCents;
    const realEstate = position.asset.realEstateProfile;
    const realEstateValue = realEstate ? realEstateMetrics({ purchasePriceCents: realEstate.purchasePriceCents, estimatedValueCents: realEstate.estimatedValueCents, financingBalanceCents: realEstate.financingBalanceCents, monthlyRentCents: realEstate.monthlyRentCents, monthlyCostsCents: realEstate.monthlyCostsCents, vacancyBasisPoints: realEstate.vacancyBasisPoints }).equityCents : null;
    const currentValueCents = realEstateValue ?? quotedValue;
    return {
      id: position.id,
      accountId: position.accountId,
      account: position.account.name,
      institution: position.account.institution,
      assetId: position.assetId,
      name: position.asset.name,
      ticker: position.asset.ticker,
      type: position.asset.type,
      group: assetGroup(position.asset.type),
      sector: position.asset.sector,
      currency: position.asset.currency,
      quantity: position.quantity.toString(),
      averagePriceCents: position.averagePriceCents.toString(),
      currentPriceCents,
      bookCostCents: position.bookCostCents,
      currentValueCents,
      unrealizedPnlCents: currentValueCents - position.bookCostCents,
      realizedPnlCents: position.realizedPnlCents,
      lastValuedAt: quote?.asOf || persisted?.asOf.toISOString() || position.lastValuedAt?.toISOString() || null,
      source: quote?.source || persisted?.provider || "MANUAL",
      freshness: quote?.freshness || (persisted ? "STALE" : "MANUAL"),
      variation24h: quote?.variation24h ?? null,
      liquidity: positionLiquidity(position.asset.type, position.asset.fixedIncomeProfile?.liquidity),
      maturityDate: position.asset.fixedIncomeProfile?.maturityDate ? isoDay(position.asset.fixedIncomeProfile.maturityDate) : null,
    };
  });

  const marketValueCentsTotal = positions.reduce((sum, item) => sum + item.currentValueCents, 0);
  const bookCostCents = positions.reduce((sum, item) => sum + item.bookCostCents, 0);
  const realizedPnlCents = positions.reduce((sum, item) => sum + item.realizedPnlCents, 0);
  const unrealizedPnlCents = marketValueCentsTotal - bookCostCents;
  const monthContributionsCents = transactionsRaw.filter((item) => item.date >= monthStart && item.date < nextMonth && (item.type === "BUY" || item.type === "DEPOSIT")).reduce((sum, item) => sum + item.netAmountCents, 0);
  const monthWithdrawalsCents = transactionsRaw.filter((item) => item.date >= monthStart && item.date < nextMonth && (item.type === "SELL" || item.type === "WITHDRAWAL")).reduce((sum, item) => sum + item.netAmountCents, 0);
  const monthIncomeCents = incomesRaw.filter((item) => item.paymentDate >= monthStart && item.paymentDate < nextMonth).reduce((sum, item) => sum + item.amountCents, 0);
  const priorSnapshot = [...snapshotsRaw].reverse().find((item) => monthKey(item.date) === priorMonth(today));
  const monthResultCents = priorSnapshot ? marketValueCentsTotal - priorSnapshot.marketValueCents - monthContributionsCents + monthWithdrawalsCents + monthIncomeCents : monthIncomeCents;

  const allocationByGroup = new Map<InvestmentAssetGroup, { valueCents: number; targetBasisPoints: number }>();
  for (const position of positions) {
    const previous = allocationByGroup.get(position.group) || { valueCents: 0, targetBasisPoints: 0 };
    previous.valueCents += position.currentValueCents;
    allocationByGroup.set(position.group, previous);
  }
  for (const target of targetsRaw) {
    const group = assetGroup(target.assetType);
    const previous = allocationByGroup.get(group) || { valueCents: 0, targetBasisPoints: 0 };
    previous.targetBasisPoints += target.targetBasisPoints;
    allocationByGroup.set(group, previous);
  }
  const allocation = allocationBreakdown([...allocationByGroup].map(([key, value]) => ({ key, ...value }))).map((item) => ({ ...item, targetBasisPoints: item.targetBasisPoints || 0, label: INVESTMENT_GROUP_LABELS[item.key as InvestmentAssetGroup].pt }));

  const budgetUsedCents = monthContributionsCents;
  const budget = budgetRaw ? {
    id: budgetRaw.id,
    mode: budgetRaw.mode,
    amountCents: budgetRaw.amountCents,
    reserveCents: budgetRaw.reserveCents,
    usedCents: budgetUsedCents,
    remainingCents: Math.max(0, budgetRaw.amountCents - budgetUsedCents),
    usageBasisPoints: budgetRaw.amountCents ? Math.round(budgetUsedCents / budgetRaw.amountCents * 10_000) : 0,
    plan: budgetRaw.plan,
  } : null;

  const history = snapshotsRaw.map((item) => ({ date: isoDay(item.date), marketValue: item.marketValueCents / 100, invested: item.investedCents / 100, contributions: item.cumulativeContributionsCents / 100, income: item.cumulativeIncomeCents / 100 }));
  if (positions.length && history.at(-1)?.date !== today) history.push({ date: today, marketValue: marketValueCentsTotal / 100, invested: bookCostCents / 100, contributions: bookCostCents / 100, income: incomesRaw.reduce((sum, item) => sum + item.amountCents, 0) / 100 });
  const firstPortfolioPoint = history.find((item) => item.marketValue > 0);
  const benchmarkAt = (day: string) => [...benchmarkHistory].reverse().find((item) => item.date <= day);
  const firstBenchmarkPoint = firstPortfolioPoint ? benchmarkAt(firstPortfolioPoint.date) : undefined;
  const benchmarkComparison = firstPortfolioPoint && firstBenchmarkPoint ? history.filter((item) => item.date >= firstPortfolioPoint.date).map((item) => ({
    date: item.date,
    portfolio: Math.round(item.marketValue / firstPortfolioPoint.marketValue * 10_000) / 100,
    selic: Math.round(((benchmarkAt(item.date)?.normalized || firstBenchmarkPoint.normalized) / firstBenchmarkPoint.normalized) * 10_000) / 100,
  })) : [];

  const incomeMonths = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(monthStart); date.setUTCMonth(date.getUTCMonth() - 11 + index); return date.toISOString().slice(0, 7);
  });
  const incomeByMonth = incomeMonths.map((key) => ({ month: key, income: incomesRaw.filter((item) => monthKey(item.paymentDate) === key).reduce((sum, item) => sum + item.amountCents, 0) / 100 }));

  const upcomingMaturities = assetsRaw.flatMap((asset) => asset.fixedIncomeProfile?.maturityDate ? [{ id: asset.id, name: asset.name, ticker: asset.ticker, date: isoDay(asset.fixedIncomeProfile.maturityDate), principalCents: asset.fixedIncomeProfile.principalCents, liquidity: asset.fixedIncomeProfile.liquidity, indexer: asset.fixedIncomeProfile.indexer }] : []).filter((item) => item.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  const liquidCents = positions.filter((item) => item.liquidity === "LIQUID").reduce((sum, item) => sum + item.currentValueCents, 0);
  const illiquidCents = positions.filter((item) => item.liquidity === "ILLIQUID").reduce((sum, item) => sum + item.currentValueCents, 0);
  const maxPosition = [...positions].sort((a, b) => b.currentValueCents - a.currentValueCents)[0];
  const maxInstitution = [...new Map(accountsRaw.map((account) => [account.institution || account.name, positions.filter((position) => position.accountId === account.id).reduce((sum, position) => sum + position.currentValueCents, 0)])).entries()].sort((a, b) => b[1] - a[1])[0];

  const recent = [
    ...transactionsRaw.slice(0, 20).map((item) => ({ id: `transaction:${item.id}`, kind: "TRANSACTION" as const, type: item.type, date: isoDay(item.date), title: item.asset?.ticker || item.asset?.name || item.type, detail: `${item.account.name} · ${item.source}`, amountCents: item.netAmountCents })),
    ...incomesRaw.slice(0, 20).map((item) => ({ id: `income:${item.id}`, kind: "INCOME" as const, type: item.type, date: isoDay(item.paymentDate), title: item.asset?.ticker || item.asset?.name || item.type, detail: `${item.account.name} · ${item.type}`, amountCents: item.amountCents })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);

  const closedTrades = tradesRaw.filter((trade) => trade.status === "CLOSED" && trade.exitDate && trade.exitPriceCents).map((trade) => ({ direction: trade.direction, entryPriceCents: number(trade.entryPriceCents), exitPriceCents: number(trade.exitPriceCents), quantity: trade.quantity.toString(), feesCents: trade.feesCents, taxesCents: trade.taxesCents, stopPriceCents: trade.stopPriceCents ? number(trade.stopPriceCents) : null, closedAt: trade.exitDate!.toISOString() }));

  return {
    today,
    metrics: {
      marketValueCents: marketValueCentsTotal,
      bookCostCents,
      unrealizedPnlCents,
      realizedPnlCents,
      totalResultCents: unrealizedPnlCents + realizedPnlCents + incomesRaw.reduce((sum, item) => sum + item.amountCents, 0),
      returnBasisPoints: bookCostCents ? Math.round((unrealizedPnlCents + realizedPnlCents) / bookCostCents * 10_000) : 0,
      monthResultCents,
      monthIncomeCents,
      monthContributionsCents,
      monthWithdrawalsCents,
      budgetCents: budget?.amountCents || 0,
      investableCashCents: budget?.remainingCents || 0,
    },
    positions,
    allocation,
    history,
    benchmarkComparison,
    incomeByMonth,
    budget,
    upcomingMaturities,
    risk: {
      liquidCents,
      illiquidCents,
      liquidBasisPoints: marketValueCentsTotal ? Math.round(liquidCents / marketValueCentsTotal * 10_000) : 0,
      maxPosition: maxPosition ? { name: maxPosition.ticker || maxPosition.name, valueCents: maxPosition.currentValueCents, weightBasisPoints: marketValueCentsTotal ? Math.round(maxPosition.currentValueCents / marketValueCentsTotal * 10_000) : 0 } : null,
      maxInstitution: maxInstitution ? { name: maxInstitution[0], valueCents: maxInstitution[1], weightBasisPoints: marketValueCentsTotal ? Math.round(maxInstitution[1] / marketValueCentsTotal * 10_000) : 0 } : null,
    },
    recent,
    accounts: accountsRaw.map((account) => ({ id: account.id, name: account.name, institution: account.institution, type: account.type, linkedFinancialAccount: account.linkedFinancialAccount?.name || null })),
    assets: assetsRaw.map((asset) => ({ id: asset.id, name: asset.name, ticker: asset.ticker, type: asset.type, group: assetGroup(asset.type), sector: asset.sector, currency: asset.currency, provider: asset.provider, providerAssetId: asset.providerAssetId, fixedIncome: asset.fixedIncomeProfile ? { ...asset.fixedIncomeProfile, purchaseDate: isoDay(asset.fixedIncomeProfile.purchaseDate), maturityDate: asset.fixedIncomeProfile.maturityDate ? isoDay(asset.fixedIncomeProfile.maturityDate) : null, guaranteeMetadata: asset.fixedIncomeProfile.guaranteeMetadata } : null, realEstate: asset.realEstateProfile ? { ...asset.realEstateProfile, purchaseDate: isoDay(asset.realEstateProfile.purchaseDate), valuationDate: isoDay(asset.realEstateProfile.valuationDate) } : null })),
    targets: targetsRaw.map((target) => ({ assetType: target.assetType, targetBasisPoints: target.targetBasisPoints })),
    macro,
    reviews: reviewsRaw.map((review) => ({ ...review, completedAt: review.completedAt?.toISOString() || null, updatedAt: review.updatedAt.toISOString() })),
    notes: notesRaw.map((note) => ({ id: note.id, title: note.title, content: note.content, tags: note.tags, sources: note.sources, asset: note.asset, updatedAt: note.updatedAt.toISOString() })),
    watchlists: watchlistsRaw.map((watchlist) => ({ id: watchlist.id, name: watchlist.name, items: watchlist.items.map((item) => ({ id: item.id, targetPriceCents: item.targetPriceCents?.toString() || null, notes: item.notes, asset: { id: item.asset.id, name: item.asset.name, ticker: item.asset.ticker, type: item.asset.type } })) })),
    trades: tradesRaw.map((trade) => ({ id: trade.id, direction: trade.direction, entryDate: trade.entryDate.toISOString(), entryPriceCents: trade.entryPriceCents.toString(), exitDate: trade.exitDate?.toISOString() || null, exitPriceCents: trade.exitPriceCents?.toString() || null, quantity: trade.quantity.toString(), feesCents: trade.feesCents, taxesCents: trade.taxesCents, stopPriceCents: trade.stopPriceCents?.toString() || null, targetPriceCents: trade.targetPriceCents?.toString() || null, strategy: trade.strategy, setup: trade.setup, notes: trade.notes, status: trade.status, account: trade.account.name, asset: trade.asset })),
    tradingMetrics: tradingMetrics(closedTrades),
    products: productsRaw.map((product) => ({ id: product.id, institution: product.institution, product: product.product, assetType: product.assetType, indexer: product.indexer, indexerPercentageBasisPoints: product.indexerPercentageBasisPoints, spreadBasisPoints: product.spreadBasisPoints, fixedRateBasisPoints: product.fixedRateBasisPoints, eligibility: product.eligibility, eligibleLimitCents: product.eligibleLimitCents, liquidity: product.liquidity, validFrom: isoDay(product.validFrom), validUntil: product.validUntil ? isoDay(product.validUntil) : null, source: product.source, lastVerifiedAt: product.lastVerifiedAt.toISOString() })),
    goals: goalsRaw.map((goal) => ({ id: goal.id, name: goal.name, targetCents: goal.targetAmountCents, currentCents: goal.currentAmountCents, targetDate: goal.targetDate ? isoDay(goal.targetDate) : null, links: goal.investmentLinks.map((link) => ({ allocationBasisPoints: link.allocationBasisPoints, asset: link.asset })) })),
    alerts: alertsRaw.map((alert) => ({ id: alert.id, type: alert.type, targetValueCents: alert.targetValue.toString(), lastTriggeredAt: alert.lastTriggeredAt?.toISOString() || null, asset: alert.asset })),
  };
}

export type InvestmentOverviewData = Awaited<ReturnType<typeof investmentOverview>>;
