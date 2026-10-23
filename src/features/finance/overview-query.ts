import { Prisma } from "@prisma/client";
import { addDays, dateKeyToUTC, startOfMonth } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { summarizeCardStatements, type StatementRow } from "./card-statements";
import { calculateFixedExpenses, fixedExpenseItems, fixedExpenseKey, plannedActiveIn } from "./fixed-expenses";
import { buildSalaryAllocation } from "./salary-allocation";
import { statementCoverage } from "./credit-limit";
import { billsForMonth, fixedBillCoverage, monthKeys, variableOutsideStatements, type SalaryPlanView } from "./salary-plan";
import { cardStatementRows, creditCardPositions, type StatementViewer } from "./queries";
import { isUnassignedAccount } from "./unassigned-account";
import { groupBankAccounts, invoiceFunding } from "./bank-accounts";
import { personalAssetRows } from "./personal-asset-query";
import { netWorthWithPersonalAssets } from "./personal-assets";
import { pendingBankLiability } from "./planning/bank-settlement";
import { addSalaryPlanning } from "./planning/salary-planning";
import { transactionOriginSql, transactionOriginWhere, type FinanceOrigin } from "./data-origin";

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

// Card statements are private to the session's owner: they are read only when that owner asks for
// their own workspace, so partner and together scopes never see them.
export async function financeOverview(workspaceId: string, today: string, options: { statementViewer?: StatementViewer; origin?: FinanceOrigin } = {}) {
  const origin = options.origin ?? "combined";
  const originWhere = transactionOriginWhere(origin);
  const statementViewer = options.statementViewer?.workspaceId === workspaceId ? options.statementViewer : null;
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
    statementRows,
    plan,
    plannedFixedRows,
    personalAssets,
  ] = await Promise.all([
    prisma.account.findMany({
      where: { workspaceId, isArchived: false },
      select: { id: true, name: true, institution: true, type: true, initialBalanceCents: true, creditLimitCents: true, closingDay: true, dueDay: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.financeTransaction.groupBy({
      by: ["accountId", "type"],
      where: { workspaceId, source: { not: "QUICK_INCOME" }, date: { lt: tomorrow } },
      _sum: { amountCents: true },
    }),
    prisma.financeTransaction.groupBy({
      by: ["destinationAccountId"],
      where: { workspaceId, type: "TRANSFER", destinationAccountId: { not: null }, date: { lt: tomorrow } },
      _sum: { amountCents: true },
    }),
    prisma.$queryRaw<DailyRow[]>(Prisma.sql`
      SELECT "date" AS day, "type"::text AS type, SUM("amountCents")::bigint AS total
      FROM "FinanceTransaction"
      WHERE "workspaceId"=${workspaceId} AND "isConsumption"=true AND "source"<>'QUICK_INCOME' AND "date">=${previousStart} AND "date"<${tomorrow} AND ${transactionOriginSql(origin)}
      GROUP BY 1,2 ORDER BY 1 ASC
    `),
    prisma.financeTransaction.groupBy({
      by: ["categoryId"],
      where: { workspaceId, type: "EXPENSE", isConsumption: true, date: currentRange, AND: originWhere },
      _sum: { amountCents: true },
      orderBy: { _sum: { amountCents: "desc" } },
      take: 6,
    }),
    prisma.financeTransaction.groupBy({
      by: ["categoryId"],
      where: { workspaceId, type: "EXPENSE", isConsumption: true, date: { gte: previousStart, lt: monthStart }, AND: originWhere },
      _sum: { amountCents: true },
    }),
    prisma.financeCategory.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
    }),
    prisma.financeTransaction.findMany({
      where: { workspaceId, type: "EXPENSE", isConsumption: true, date: currentRange, AND: originWhere },
      select: { amountCents: true, description: true, merchant: true, recurring: true, subscriptionId: true, fixedExpenseId: true, accountId: true, date: true, cardStatementId: true },
    }),
    prisma.subscription.findMany({
      where: { workspaceId, status: "ACTIVE" },
      select: { id: true, name: true, merchant: true, amountCents: true, billingCycle: true, customDays: true, nextChargeDate: true, accountId: true, fixedExpenseId: true },
    }),
    prisma.debt.findMany({
      where: { workspaceId, status: "ACTIVE" },
      select: { id: true, name: true, remainingBalanceCents: true, minimumPaymentCents: true, dueDay: true },
    }),
    prisma.savingsGoal.findMany({
      where: { workspaceId, status: "ACTIVE" },
      select: { id: true, name: true, currentAmountCents: true, targetAmountCents: true, targetDate: true, monthlyContributionCents: true, status: true, contributionFrequency: true, recurrence: true, contributions: { where: { kind: "PAYMENT" }, select: { amountCents: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.financeTransaction.findFirst({
      where: { workspaceId, type: "INCOME", source: "QUICK_INCOME" },
      select: { amountCents: true, accountId: true, account: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.financeTransaction.findMany({
      where: { workspaceId, source: { not: "QUICK_INCOME" }, type: { not: "TRANSFER" }, AND: originWhere },
      select: { id: true, type: true, description: true, merchant: true, amountCents: true, date: true, source: true, account: { select: { name: true } }, category: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.$queryRaw<BudgetRow[]>(Prisma.sql`
      SELECT b."id", c."name" AS category, b."limitCents", COALESCE(SUM(t."amountCents"),0)::bigint AS "spentCents"
      FROM "Budget" b
      JOIN "FinanceCategory" c ON c."id"=b."categoryId"
      LEFT JOIN "FinanceTransaction" t ON t."workspaceId"=b."workspaceId" AND t."isConsumption"=true AND t."categoryId"=b."categoryId" AND t."type"='EXPENSE' AND t."date">=b."startDate" AND t."date"<=b."endDate" AND ${transactionOriginSql(origin, "t")}
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
    statementViewer ? cardStatementRows(statementViewer, origin) : Promise.resolve<StatementRow[]>([]),
    prisma.financePlan.findUnique({ where: { workspaceId }, include: { receivingAccount: { select: { name: true, type: true, isArchived: true } } } }),
    prisma.fixedExpense.findMany({ where: { workspaceId, isActive: true }, orderBy: [{ dueDay: "asc" }, { name: "asc" }] }),
    personalAssetRows(workspaceId),
  ]);
  const statements = summarizeCardStatements(statementRows, today);
  const positions = await creditCardPositions(workspaceId, today, statementRows, { accounts: accounts.filter(row => row.type === "CREDIT_CARD"), originThroughToday: originMovements, incomingThroughToday: incomingTransfers, origin });

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
  // Every active plan with its end date as a day. The ones whose last month has passed no longer count anywhere.
  const dayText = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);
  const plannedAll = plannedFixedRows.map(({ pixKeyEncrypted, ...row }) => ({ ...row, hasPixKey: Boolean(pixKeyEncrypted), startsOn: dayText(row.startsOn), endsOn: dayText(row.endsOn) }));
  const plannedFixed = plannedActiveIn(plannedAll, currentKey);
  const cardIds = new Set(accounts.filter((account) => account.type === "CREDIT_CARD").map((account) => account.id));
  const toPlanned = (rows: typeof plannedAll) => rows.map((row) => ({ id: row.id, name: row.name, amountCents: row.amountCents + (row.safetyMarginCents ?? 0), cardId: row.cardAccountId }));
  const periodRows: PeriodRow[] = dailyRows.map(row => ({ period: new Date(Date.UTC(row.day.getUTCFullYear(), row.day.getUTCMonth(), 1)), type: row.type, total: row.total }));
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
    if (row.day < monthStart) continue;
    const date = row.day.toISOString().slice(0, 10);
    const point = dailyMap.get(date) || { date, income: 0, expenses: 0, balance: 0 };
    const value = Number(row.total) / 100;
    if (row.type === "INCOME" || row.type === "REFUND") point.income += value;
    if (row.type === "EXPENSE") point.expenses += value;
    point.balance = point.income - point.expenses;
    dailyMap.set(date, point);
  }

  const fixedNames = [...plannedFixed.map((item)=>item.name), ...subscriptions.flatMap((item)=>[item.name,item.merchant||""])].map(fixedExpenseKey).filter(Boolean);
  const postedFixed = recurringExpenses.filter((item)=>item.recurring || item.fixedExpenseId || item.subscriptionId || [item.description,item.merchant||""].some((name)=>fixedNames.includes(fixedExpenseKey(name))));
  const fixed = calculateFixedExpenses(postedFixed, subscriptions, toPlanned(plannedFixed));
  const incomeReferenceCents = plan ? plan.incomeCents : monthlyIncome?.amountCents || 0;
  const fixedPaidCents = Math.min(current.expensesCents, fixed.postedCents);
  // The salary map uses the very same universe as the "Fixos" and "Uso da renda" figures, itemised.
  const currentItems = fixedExpenseItems(postedFixed, subscriptions, toPlanned(plannedFixed), { cardIds });
  const salary = buildSalaryAllocation({ incomeCents: incomeReferenceCents, items: currentItems, variableCents: Math.max(0, current.expensesCents - fixedPaidCents) });
  const coveredNames = new Set(fixedNames);
  // Minimum payments of debts are not part of the usage figure; listed apart so nothing is counted twice.
  const debtMinimumsCents = debts.filter((debt) => !coveredNames.has(fixedExpenseKey(debt.name))).reduce((sum, debt) => sum + Math.max(0, debt.minimumPaymentCents), 0);

  // The plan for this month and the next five. Card purchases reach it through their bill, so the variable slice
  // leaves out what a registered statement already holds. Later months have no variable spending yet; they carry
  // the plan's fixed expenses, the active subscriptions and the recurring postings of this month.
  const postedFixedSet = new Set(postedFixed);
  const cardCoverage = new Map(positions.map((card) => [card.id, { hasStatements: Boolean(card.totals), coverage: statementCoverage(card.statements) }]));
  const variableOutsideBillsCents = variableOutsideStatements({
    cards: cardCoverage,
    expenses: recurringExpenses.map((row) => ({ amountCents: row.amountCents, accountId: row.accountId, date: row.date.toISOString().slice(0, 10), cardStatementId: row.cardStatementId, isFixed: postedFixedSet.has(row) })),
  });
  const recurringCarry = postedFixed.filter((row) => row.recurring);
  const billPurchases = statementViewer?.role === "OWNER" ? await prisma.financeTransaction.findMany({
    where: { workspaceId, type: "EXPENSE", cardStatementId: { in: statementRows.map(row => row.id) } },
    select: { id: true, accountId: true, cardStatementId: true, amountCents: true, description: true, merchant: true, subscriptionId: true, fixedExpenseId: true },
  }) : [];
  let salaryPlan: SalaryPlanView = {
    canSeeBills: statementViewer?.role === "OWNER",
    excludedDebtMinimumsCents: debtMinimumsCents,
    openBillsCents: statementRows.filter(row => row.kind === "STATEMENT" && row.status === "OPEN" && !row.rolledIntoStatementId).reduce((sum, row) => sum + row.amountCents, 0),
    openBillsCount: statementRows.filter(row => row.kind === "STATEMENT" && row.status === "OPEN" && !row.rolledIntoStatementId).length,
    undatedBillsCount: statementRows.filter(row => row.kind === "STATEMENT" && row.status === "FUTURE_KNOWN" && !row.rolledIntoStatementId && !row.dueDate).length,
    months: monthKeys(today).map((month, index) => {
      const planned = plannedActiveIn(plannedAll, month);
      const plannedNames = new Set(planned.map((row) => fixedExpenseKey(row.name)));
      const carried = recurringCarry.filter((row) => ![fixedExpenseKey(row.description), fixedExpenseKey(row.merchant)].some((name) => name && plannedNames.has(name)));
      const bills = statementViewer ? billsForMonth(statementRows, month, today) : [];
      const items = index === 0 ? currentItems : fixedExpenseItems(carried, subscriptions, toPlanned(planned), { cardIds });
      return {
        month, incomeCents: incomeReferenceCents,
        items: fixedBillCoverage(items, bills, billPurchases),
        bills,
        variableCents: index === 0 ? variableOutsideBillsCents : 0, variablesKnown: index === 0,
      };
    }),
  };
  if (statementViewer?.role === "OWNER") salaryPlan = await addSalaryPlanning(workspaceId, today, salaryPlan, {
    accounts, fixed: plannedAll, subscriptions: subscriptions.map(row => ({ ...row, nextChargeDate: dayText(row.nextChargeDate)!, fixedExpenseId: row.fixedExpenseId ?? null, accountId: row.accountId ?? null })), statements: statementRows,
    goals: savingsGoals.map(row => ({ ...row, targetDate: dayText(row.targetDate), monthlyContributionCents: row.monthlyContributionCents ?? null, paidAmountCents: (row.contributions ?? []).reduce((sum, item) => sum + item.amountCents, 0) })), incomeCents: incomeReferenceCents || null,
  }, origin);
  // Same limit rule as the accounts and statements screens: one breakdown per card.
  const creditCards = positions.map((card) => {
    const due = nextDueDate(today, card.dueDay);
    return {
      id: card.id, name: card.name, institution: card.institution, limitCents: card.creditLimitCents || 0, closingDay: card.closingDay, dueDay: card.dueDay,
      nextDueDate: due?.toISOString().slice(0, 10) || null,
      // A card with registered statements is billed by them; its ledger purchases are not added again.
      invoiceCents: card.breakdown.openCents, invoiceSource: card.totals ? "STATEMENT" as const : "LEDGER" as const, statement: card.totals, breakdown: card.breakdown,
    };
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
    ...creditCards.flatMap((item) => item.invoiceSource === "LEDGER" && item.nextDueDate && item.invoiceCents > 0 ? [{ id: `card-${item.id}`, label: item.name, kind: "CARD" as const, amountCents: item.invoiceCents, date: dateKeyToUTC(item.nextDueDate) }] : []),
    ...statements.open.map((item) => ({ id: `statement-${item.id}`, label: item.accountName, kind: "CARD" as const, amountCents: item.amountCents, date: dateKeyToUTC(item.dueDate!) })),
    ...investmentMaturities.flatMap((item) => item.maturityDate ? [{ id: `investment-${item.asset.id}`, label: item.asset.ticker || item.asset.name, kind: "INVESTMENT" as const, amountCents: item.principalCents, date: item.maturityDate }] : []),
  ].filter((item) => item.date >= todayDate && item.date <= sevenDays)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 7)
    .map((item) => ({ ...item, date: item.date.toISOString().slice(0, 10) }));

  const debtCents = debts.reduce((sum, debt) => sum + debt.remainingBalanceCents, 0);
  const funding = invoiceFunding(accountRows, statementRows, today);
  const pendingBankSettlementCents = pendingBankLiability(statementRows.flatMap(row => row.payments ?? []));
  const financialNetWorthCents = accountRows.filter((account) => !account.unassigned && account.type!=="CREDIT_CARD").reduce((sum, account) => sum + account.balanceCents, 0) - positions.reduce((sum,card)=>sum+card.breakdown.committedCents,0) - debtCents - pendingBankSettlementCents;
  // A conta Finance vinculada já carrega o principal transferido. Somamos apenas
  // valorização e resultado realizado; carteiras sem vínculo entram pelo valor atual.
  const investmentAdjustmentCents = investmentPositions.reduce((sum, position) => position.account.linkedFinancialAccountId
    ? sum + position.currentValueCents - position.bookCostCents + position.realizedPnlCents
    : sum + position.currentValueCents, 0);
  const investmentValueCents = investmentPositions.reduce((sum, position) => sum + position.currentValueCents, 0);
  const wealth = netWorthWithPersonalAssets(financialNetWorthCents + investmentAdjustmentCents, personalAssets);
  const totalSavingsCents = savingsGoals.reduce((sum, goal) => sum + goal.currentAmountCents, 0);
  const savingsTargetCents = savingsGoals.reduce((sum, goal) => sum + goal.targetAmountCents, 0);

  return {
    today,
    canExportReport: statementViewer?.role === "OWNER",
    calendarStatements: statementRows.map(({ id, accountId, kind, status, dueDate, closingDate, closingDay, referenceMonth, amountCents, detailedCents, rolledIntoStatementId }) => ({ id, accountId, kind, status, dueDate, closingDate, closingDay, referenceMonth, amountCents, detailedCents: detailedCents ?? 0, rolledIntoStatementId })),
    metrics: {
      ...wealth,
      incomeCents: current.incomeCents,
      expensesCents: current.expensesCents,
      balanceCents: current.balanceCents,
      cashBalanceCents: funding.cashCents,
      reserveBalanceCents: funding.reserveCents,
      previousBalanceCents: previous.balanceCents,
      fixedCents: fixed.amountCents,
      openInvoicesCents: creditCards.reduce((sum, card) => sum + card.invoiceCents, 0),
      incomeReferenceCents,
      fixedPaidCents,
      variableCents: Math.max(0, current.expensesCents - fixedPaidCents),
      availableCents: Math.max(0, incomeReferenceCents - fixed.amountCents - Math.max(0,current.expensesCents-fixedPaidCents)),
      committedIncomeCents: fixed.amountCents + Math.max(0,current.expensesCents-fixedPaidCents),
      debtCents,
      pendingBankSettlementCents,
      savingsCents: current.balanceCents,
      totalSavingsCents,
      savingsTargetCents,
      investmentValueCents,
      investmentAdjustmentCents,
    },
    monthlyIncome: { amountCents: plan ? plan.incomeCents : monthlyIncome?.amountCents || 0, accountId: plan?.receivingAccount&&!plan.receivingAccount.isArchived ? plan.receivingAccountId || "" : "", accountName: plan?.receivingAccount?.name || null, payDay: plan?.payDay || null, legacy: !plan && !!monthlyIncome },
    daily: [...dailyMap.values()],
    categories: currentCategories.map((category) => {
      const amountCents = category._sum.amountCents || 0;
      const beforeCents = previousCategoryAmounts.get(category.categoryId) || 0;
      return { category: category.categoryId ? categoryById.get(category.categoryId) || "Categoria removida" : "Sem categoria", amount: amountCents / 100, amountCents, previousCents: beforeCents, delta: beforeCents ? Math.round((amountCents - beforeCents) / beforeCents * 100) : null };
    }),
    accounts: accountRows.map(({ id, name, institution, type, balanceCents, unassigned }) => ({ id, name, institution, type, balanceCents, unassigned })),
    banks: groupBankAccounts(accountRows).map(({ id, name, institution, cashCents, reserveCents, hasCash, accounts: products }) => ({ id, name, institution, cashCents, reserveCents, hasCash, cardCount: products.filter((account) => account.type === "CREDIT_CARD").length })),
    funding: statementViewer?.role === "OWNER" ? funding : null,
    plannedFixed: plannedAll,
    personalAssets,
    creditCards,
    cardStatements: {
      openCount: statements.open.length,
      dueDates: statements.dueDates,
      overdue: statements.open.filter((item) => item.overdue).map(({ id, accountName, amountCents, dueDate }) => ({ id, accountName, amountCents, dueDate: dueDate! })),
      pending: statements.pending.map(({ id, accountName, amountCents, referenceMonth }) => ({ id, accountName, amountCents, referenceMonth: referenceMonth! })),
    },
    upcoming,
    savingsGoals,
    recent: recent.map((item) => ({ id: item.id, type: item.type, description: item.description, merchant: item.merchant, amountCents: item.amountCents, date: item.date.toISOString().slice(0, 10), source: item.source, account: item.account.name, category: item.category?.name || "Sem categoria" })),
    budgets: budgets.map((item) => ({ id: item.id, category: item.category, limitCents: item.limitCents, spentCents: Number(item.spentCents), usage: item.limitCents ? Math.round(Number(item.spentCents) / item.limitCents * 100) : 0 })),
    fixedDetails: fixed,
    salary: { ...salary, excludedDebtMinimumsCents: debtMinimumsCents },
    salaryPlan,
  };
}
