import { Prisma } from "@prisma/client";
import { addDays, dateKeyToUTC, startOfMonth } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { calculateFixedExpenses } from "./fixed-expenses";
import { isUnassignedAccount } from "./unassigned-account";

export type FinanceOverviewData = Awaited<ReturnType<typeof financeOverview>>;

type DailyRow = { day: Date; type: string; total: bigint };
type PeriodRow = { period: Date; type: string; total: bigint };
type BudgetRow = { id: string; category: string; limitCents: number; spentCents: bigint };

function monthBefore(day: string) {
  const [year, month] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 2, 1));
}

function nextDueDate(today: string, dueDay: number | null) {
  if (!dueDay) return null;
  const [year, month] = today.split("-").map(Number);
  const todayDate = dateKeyToUTC(today);
  const make = (valueYear: number, valueMonth: number) =>
    new Date(Date.UTC(valueYear, valueMonth, Math.min(dueDay, new Date(Date.UTC(valueYear, valueMonth + 1, 0)).getUTCDate())));
  let due = make(year, month - 1);
  if (due < todayDate) due = make(month === 12 ? year + 1 : year, month === 12 ? 0 : month);
  return due;
}

function nextSubscriptionDate(initial: Date, cycle: string, customDays: number | null, todayDate: Date) {
  const value = new Date(initial);
  for (let guard = 0; value < todayDate && guard < 240; guard += 1) {
    if (cycle === "WEEKLY") value.setUTCDate(value.getUTCDate() + 7);
    else if (cycle === "QUARTERLY") value.setUTCMonth(value.getUTCMonth() + 3);
    else if (cycle === "YEARLY") value.setUTCFullYear(value.getUTCFullYear() + 1);
    else if (cycle === "CUSTOM" && customDays) value.setUTCDate(value.getUTCDate() + customDays);
    else value.setUTCMonth(value.getUTCMonth() + 1);
  }
  return value;
}

export async function financeOverview(workspaceId: string, today: string) {
  const todayDate = dateKeyToUTC(today);
  const tomorrow = dateKeyToUTC(addDays(today, 1));
  const monthStart = dateKeyToUTC(startOfMonth(today));
  const previousStart = monthBefore(today);
  const currentRange = { gte: monthStart, lt: tomorrow };
  const sevenDays = dateKeyToUTC(addDays(today, 7));

  const [
    accounts,
    originMovements,
    incomingTransfers,
    currentAccountMovements,
    periodRows,
    dailyRows,
    currentCategories,
    previousCategories,
    categoryNames,
    recurringExpenses,
    subscriptions,
    debts,
    savingsGoals,
    monthlyIncome,
    recent,
    budgets,
    investmentPositions,
    investmentMaturities,
  ] = await Promise.all([
    prisma.account.findMany({
      where: { workspaceId, isArchived: false },
      select: { id: true, name: true, institution: true, type: true, initialBalanceCents: true, creditLimitCents: true, closingDay: true, dueDay: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.financeTransaction.groupBy({
      by: ["accountId", "type"],
      where: { workspaceId },
      _sum: { amountCents: true },
    }),
    prisma.financeTransaction.groupBy({
      by: ["destinationAccountId"],
      where: { workspaceId, type: "TRANSFER", destinationAccountId: { not: null } },
      _sum: { amountCents: true },
    }),
    prisma.financeTransaction.groupBy({
      by: ["accountId", "type"],
      where: { workspaceId, date: currentRange },
      _sum: { amountCents: true },
    }),
    prisma.$queryRaw<PeriodRow[]>(Prisma.sql`
      SELECT date_trunc('month', "date") AS period, "type"::text AS type, SUM("amountCents")::bigint AS total
      FROM "FinanceTransaction"
      WHERE "workspaceId"=${workspaceId} AND "date">=${previousStart} AND "date"<${tomorrow}
      GROUP BY 1,2 ORDER BY 1 ASC
    `),
    prisma.$queryRaw<DailyRow[]>(Prisma.sql`
      SELECT "date" AS day, "type"::text AS type, SUM("amountCents")::bigint AS total
      FROM "FinanceTransaction"
      WHERE "workspaceId"=${workspaceId} AND "date">=${monthStart} AND "date"<${tomorrow}
      GROUP BY 1,2 ORDER BY 1 ASC
    `),
    prisma.financeTransaction.groupBy({
      by: ["categoryId"],
      where: { workspaceId, type: "EXPENSE", date: currentRange },
      _sum: { amountCents: true },
      orderBy: { _sum: { amountCents: "desc" } },
      take: 6,
    }),
    prisma.financeTransaction.groupBy({
      by: ["categoryId"],
      where: { workspaceId, type: "EXPENSE", date: { gte: previousStart, lt: monthStart } },
      _sum: { amountCents: true },
    }),
    prisma.financeCategory.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
    }),
    prisma.financeTransaction.findMany({
      where: { workspaceId, type: "EXPENSE", recurring: true, date: currentRange },
      select: { amountCents: true, description: true, merchant: true },
    }),
    prisma.subscription.findMany({
      where: { workspaceId, status: "ACTIVE" },
      select: { id: true, name: true, merchant: true, amountCents: true, billingCycle: true, customDays: true, nextChargeDate: true, accountId: true },
    }),
    prisma.debt.findMany({
      where: { workspaceId, status: "ACTIVE" },
      select: { id: true, name: true, remainingBalanceCents: true, minimumPaymentCents: true, dueDay: true },
    }),
    prisma.savingsGoal.findMany({
      where: { workspaceId, status: "ACTIVE" },
      select: { id: true, name: true, currentAmountCents: true, targetAmountCents: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.financeTransaction.findFirst({
      where: { workspaceId, type: "INCOME", recurring: true, tags: { has: "renda-mensal:tbb" }, date: { lt: tomorrow } },
      select: { amountCents: true, accountId: true, account: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.financeTransaction.findMany({
      where: { workspaceId, type: { not: "TRANSFER" } },
      select: { id: true, type: true, description: true, merchant: true, amountCents: true, date: true, source: true, account: { select: { name: true } }, category: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.$queryRaw<BudgetRow[]>(Prisma.sql`
      SELECT b."id", c."name" AS category, b."limitCents", COALESCE(SUM(t."amountCents"),0)::bigint AS "spentCents"
      FROM "Budget" b
      JOIN "FinanceCategory" c ON c."id"=b."categoryId"
      LEFT JOIN "FinanceTransaction" t ON t."workspaceId"=b."workspaceId" AND t."categoryId"=b."categoryId" AND t."type"='EXPENSE' AND t."date">=b."startDate" AND t."date"<=b."endDate"
      WHERE b."workspaceId"=${workspaceId} AND b."startDate"<=${todayDate} AND b."endDate">=${todayDate}
      GROUP BY b."id", c."name", b."limitCents"
      ORDER BY b."limitCents" DESC
    `),
    prisma.investmentPosition.findMany({
      where: { workspaceId, account: { archivedAt: null }, asset: { archivedAt: null } },
      select: { currentValueCents: true, bookCostCents: true, realizedPnlCents: true, account: { select: { linkedFinancialAccountId: true } } },
    }),
    prisma.investmentFixedIncomeProfile.findMany({
      where: { asset: { workspaceId, archivedAt: null }, maturityDate: { gte: todayDate, lte: sevenDays } },
      select: { principalCents: true, maturityDate: true, asset: { select: { id: true, name: true, ticker: true } } },
      orderBy: { maturityDate: "asc" },
      take: 5,
    }),
  ]);

  const categoryById = new Map(categoryNames.map((category) => [category.id, category.name]));
  const previousCategoryAmounts = new Map(previousCategories.map((category) => [category.categoryId, category._sum.amountCents || 0]));
  const accountOrigin = new Map<string, number>();
  for (const movement of originMovements) {
    const amount = movement._sum.amountCents || 0;
    const signed = movement.type === "INCOME" || movement.type === "REFUND" || movement.type === "ADJUSTMENT" ? amount : -amount;
    accountOrigin.set(movement.accountId, (accountOrigin.get(movement.accountId) || 0) + signed);
  }
  const accountIncoming = new Map(incomingTransfers.map((movement) => [movement.destinationAccountId || "", movement._sum.amountCents || 0]));
  const accountRows = accounts.map((account) => ({
    ...account,
    balanceCents: account.initialBalanceCents + (accountOrigin.get(account.id) || 0) + (accountIncoming.get(account.id) || 0),
    unassigned: isUnassignedAccount(account),
  }));

  const currentKey = today.slice(0, 7);
  const previousKey = previousStart.toISOString().slice(0, 7);
  const totalsFor = (key: string) => {
    let incomeCents = 0;
    let expensesCents = 0;
    for (const row of periodRows) {
      if (row.period.toISOString().slice(0, 7) !== key) continue;
      const value = Number(row.total);
      if (row.type === "INCOME" || row.type === "REFUND") incomeCents += value;
      if (row.type === "EXPENSE") expensesCents += value;
    }
    return { incomeCents, expensesCents, balanceCents: incomeCents - expensesCents };
  };
  const current = totalsFor(currentKey);
  const previous = totalsFor(previousKey);

  const dailyMap = new Map<string, { date: string; income: number; expenses: number; balance: number }>();
  for (const row of dailyRows) {
    const date = row.day.toISOString().slice(0, 10);
    const point = dailyMap.get(date) || { date, income: 0, expenses: 0, balance: 0 };
    const value = Number(row.total) / 100;
    if (row.type === "INCOME" || row.type === "REFUND") point.income += value;
    if (row.type === "EXPENSE") point.expenses += value;
    point.balance = point.income - point.expenses;
    dailyMap.set(date, point);
  }

  const fixed = calculateFixedExpenses(recurringExpenses, subscriptions);
  const incomeReferenceCents = monthlyIncome?.amountCents || current.incomeCents;
  const fixedPaidCents = Math.min(current.expensesCents, fixed.postedCents);
  const creditCards = accountRows.filter((account) => account.type === "CREDIT_CARD").map((account) => {
    const spentCents = Math.max(0, -(accountOrigin.get(account.id) || 0));
    const monthSpentCents = Math.max(0, currentAccountMovements
      .filter((movement) => movement.accountId === account.id && (movement.type === "EXPENSE" || movement.type === "REFUND"))
      .reduce((sum, movement) => sum + (movement.type === "EXPENSE" ? movement._sum.amountCents || 0 : -(movement._sum.amountCents || 0)), 0));
    const limitCents = account.creditLimitCents || 0;
    const due = nextDueDate(today, account.dueDay);
    return { id: account.id, name: account.name, institution: account.institution, spentCents, monthSpentCents, limitCents, availableCents: Math.max(0, limitCents - monthSpentCents), usage: limitCents ? Math.round(monthSpentCents / limitCents * 100) : null, closingDay: account.closingDay, dueDay: account.dueDay, nextDueDate: due?.toISOString().slice(0, 10) || null };
  });

  const upcoming = [
    ...subscriptions.map((item) => ({
      id: `subscription-${item.id}`,
      label: item.name,
      kind: "SUBSCRIPTION" as const,
      amountCents: item.amountCents,
      date: nextSubscriptionDate(item.nextChargeDate, item.billingCycle, item.customDays, todayDate),
    })),
    ...debts.flatMap((item) => {
      const due = nextDueDate(today, item.dueDay);
      return due ? [{ id: `debt-${item.id}`, label: item.name, kind: "DEBT" as const, amountCents: item.minimumPaymentCents, date: due }] : [];
    }),
    ...creditCards.flatMap((item) => item.nextDueDate && item.monthSpentCents > 0 ? [{ id: `card-${item.id}`, label: item.name, kind: "CARD" as const, amountCents: item.monthSpentCents, date: dateKeyToUTC(item.nextDueDate) }] : []),
    ...investmentMaturities.flatMap((item) => item.maturityDate ? [{ id: `investment-${item.asset.id}`, label: item.asset.ticker || item.asset.name, kind: "INVESTMENT" as const, amountCents: item.principalCents, date: item.maturityDate }] : []),
  ].filter((item) => item.date >= todayDate && item.date <= sevenDays)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 7)
    .map((item) => ({ ...item, date: item.date.toISOString().slice(0, 10) }));

  const debtCents = debts.reduce((sum, debt) => sum + debt.remainingBalanceCents, 0);
  const financialNetWorthCents = accountRows.filter((account) => !account.unassigned).reduce((sum, account) => sum + account.balanceCents, 0) - debtCents;
  // A conta Finance vinculada já carrega o principal transferido. Somamos apenas
  // valorização e resultado realizado; carteiras sem vínculo entram pelo valor atual.
  const investmentAdjustmentCents = investmentPositions.reduce((sum, position) => position.account.linkedFinancialAccountId
    ? sum + position.currentValueCents - position.bookCostCents + position.realizedPnlCents
    : sum + position.currentValueCents, 0);
  const investmentValueCents = investmentPositions.reduce((sum, position) => sum + position.currentValueCents, 0);
  const netWorthCents = financialNetWorthCents + investmentAdjustmentCents;
  const totalSavingsCents = savingsGoals.reduce((sum, goal) => sum + goal.currentAmountCents, 0);
  const savingsTargetCents = savingsGoals.reduce((sum, goal) => sum + goal.targetAmountCents, 0);

  return {
    today,
    metrics: {
      netWorthCents,
      incomeCents: current.incomeCents,
      expensesCents: current.expensesCents,
      balanceCents: current.balanceCents,
      previousBalanceCents: previous.balanceCents,
      fixedCents: fixed.amountCents,
      openInvoicesCents: creditCards.reduce((sum, card) => sum + card.monthSpentCents, 0),
      incomeReferenceCents,
      fixedPaidCents,
      variableCents: Math.max(0, current.expensesCents - fixedPaidCents),
      availableCents: Math.max(0, incomeReferenceCents - current.expensesCents),
      debtCents,
      savingsCents: current.balanceCents,
      totalSavingsCents,
      savingsTargetCents,
      investmentValueCents,
      investmentAdjustmentCents,
    },
    monthlyIncome: { amountCents: monthlyIncome?.amountCents || 0, accountId: monthlyIncome?.accountId || "", accountName: monthlyIncome?.account.name || null },
    daily: [...dailyMap.values()],
    categories: currentCategories.map((category) => {
      const amountCents = category._sum.amountCents || 0;
      const beforeCents = previousCategoryAmounts.get(category.categoryId) || 0;
      return { category: category.categoryId ? categoryById.get(category.categoryId) || "Categoria removida" : "Sem categoria", amount: amountCents / 100, amountCents, previousCents: beforeCents, delta: beforeCents ? Math.round((amountCents - beforeCents) / beforeCents * 100) : null };
    }),
    accounts: accountRows.map(({ id, name, institution, type, balanceCents, unassigned }) => ({ id, name, institution, type, balanceCents, unassigned })),
    creditCards,
    upcoming,
    savingsGoals,
    recent: recent.map((item) => ({ id: item.id, type: item.type, description: item.description, merchant: item.merchant, amountCents: item.amountCents, date: item.date.toISOString().slice(0, 10), source: item.source, account: item.account.name, category: item.category?.name || "Sem categoria" })),
    budgets: budgets.map((item) => ({ id: item.id, category: item.category, limitCents: item.limitCents, spentCents: Number(item.spentCents), usage: item.limitCents ? Math.round(Number(item.spentCents) / item.limitCents * 100) : 0 })),
    fixedDetails: fixed,
  };
}
