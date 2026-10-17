import type { StatementLite } from "../salary-plan";
import { billsForMonth, monthKeys } from "../salary-plan";
import { plannedActiveIn } from "../fixed-expenses";
import { commitmentMerchant } from "./fixed-matching";
import { goalContributionPlan, type GoalPlan } from "./goals";
import { limitWindow, spendingLimitUsage, type Limit, type LimitTransaction } from "./spending-limits";

export type ForecastAccount = { id: string; name: string; type: string; closingDay: number | null; dueDay: number | null };
export type ForecastFixed = { id: string; name: string; amountCents: number; startsOn?: string | null; endsOn: string | null; dueDay: number | null; cardAccountId: string | null; paymentAccountId?: string | null; paymentMethod?: string; safetyMarginCents?: number; expectedMaxCents?: number | null; confirmationStatus?: string };
export type ForecastSubscription = { id: string; name: string; amountCents: number; fixedExpenseId: string | null; accountId: string | null; nextChargeDate: string; billingCycle: string; customDays: number | null };
export type ForecastTransaction = LimitTransaction & { description: string; merchant?: string | null; revision?: number };
export type MonthlyOverride = { month: string; incomeOverrideCents: number | null; extraIncomeCents: number; extraIncomeStatus: string; variableBudgetCents: number | null; variableCardAccountId: string | null; otherOutflowCents: number; otherOutflowDescription: string | null };
export type ForecastSource = { key: string; kind: "CARD_STATEMENT" | "FIXED_PLAN" | "CONFIRMED_TRANSACTION" | "VARIABLE_BUDGET" | "SAVINGS_ALLOCATION" | "ONE_TIME_OBLIGATION" | "EXPECTED_INCOME"; label: string; cents: number; accountId?: string | null; estimated?: boolean };
export type ForecastMonth = {
  month: string; incomeCents: number | null; receivedCents: number; extraExpectedCents: number; billsCents: number; paidBillsCents: number;
  fixedOutsideBillsCents: number; fixedIncludedInBillsCents: number; variableCashCents: number; variablePlannedCents: number;
  variableActualCents: number; fixedConsumptionCents: number; otherOutflowCents: number; reservesCents: number; fundedGoalUseCents: number;
  surplusCents: number | null; cashSurplusCents: number | null; conservativeCents: number | null; economicCents: number | null;
  uncertainFixedExtraCents: number; issues: string[]; sources: ForecastSource[];
};
export function projectionDate(month: string, day: number) {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1, Math.min(day, new Date(Date.UTC(year, number, 0)).getUTCDate()))).toISOString().slice(0, 10);
}
/** This is an estimate from the configured cycle, never a date written into a statement or ledger. */
export function forecastBillingMonth(purchaseDate: string, account: ForecastAccount | undefined) {
  if (!account || account.type !== "CREDIT_CARD") return { month: purchaseDate.slice(0, 7), estimated: false };
  if (!account.closingDay || !account.dueDay) return { month: purchaseDate.slice(0, 7), estimated: true, missing: true };
  const [year, month, day] = purchaseDate.split("-").map(Number);
  // Purchases on closing day conservatively belong to the following cycle, matching the existing card capture flow.
  const closeMonth = month - 1 + (day >= account.closingDay ? 1 : 0);
  const dueMonth = closeMonth + (account.dueDay <= account.closingDay ? 1 : 0);
  return { month: new Date(Date.UTC(year, dueMonth, 1)).toISOString().slice(0, 7), estimated: true };
}
export function buildFinancialForecast(input: {
  today: string; startsOn: string; count: number; incomeDefaultCents: number | null; accounts: ForecastAccount[]; fixed: ForecastFixed[];
  subscriptions: ForecastSubscription[]; transactions: ForecastTransaction[]; statements: StatementLite[]; overrides: MonthlyOverride[];
  goals: GoalPlan[]; limits: { limit: Limit; remainingCents: number; decisions?: { transactionId: string; decision: string }[] }[]; economicReductionPercent?: number; dataTruncated?: boolean;
}) {
  const months = monthKeys(input.startsOn, Math.min(24, Math.max(1, input.count))), overrides = new Map(input.overrides.map(row => [row.month, row]));
  const accounts = new Map(input.accounts.map(row => [row.id, row])), statements = new Map(input.statements.map(row => [row.id, row]));
  const result = new Map<string, ForecastMonth>();
  for (const month of months) {
    const override = overrides.get(month), income = override?.incomeOverrideCents ?? input.incomeDefaultCents;
    const bills = billsForMonth(input.statements, month, input.today), extra = override?.extraIncomeCents ?? 0;
    result.set(month, { month, incomeCents: income === null ? null : income + extra, receivedCents: 0, extraExpectedCents: override?.extraIncomeStatus === "EXPECTED" ? extra : 0,
      billsCents: bills.reduce((sum, bill) => sum + bill.toPayCents + bill.paidCents, 0), paidBillsCents: bills.reduce((sum, bill) => sum + bill.paidCents, 0),
      fixedOutsideBillsCents: 0, fixedIncludedInBillsCents: 0, variableCashCents: 0, variablePlannedCents: 0, variableActualCents: 0, fixedConsumptionCents: 0,
      otherOutflowCents: override?.otherOutflowCents ?? 0, reservesCents: 0, fundedGoalUseCents: 0, surplusCents: null, cashSurplusCents: null, conservativeCents: null, economicCents: null,
      uncertainFixedExtraCents: 0, issues: [], sources: bills.map(bill => ({ key: bill.key, kind: "CARD_STATEMENT", label: bill.label, cents: bill.toPayCents + bill.paidCents, accountId: bill.key })) });
    if (income === null) result.get(month)!.issues.push("INCOME_UNKNOWN");
    if (!override || override.variableBudgetCents === null) result.get(month)!.issues.push("VARIABLE_BUDGET_UNKNOWN");
    if (input.dataTruncated) result.get(month)!.issues.push("HISTORY_TRUNCATED");
  }
  const sourceMonths = monthKeys(new Date(Date.UTC(Number(months[0].slice(0, 4)), Number(months[0].slice(5, 7)) - 2, 1)).toISOString().slice(0, 10), months.length + 2);
  const linkedFixed = new Map(input.subscriptions.filter(row => row.fixedExpenseId).map(row => [row.id, row.fixedExpenseId!]));
  const fixedForTransaction = (row: ForecastTransaction) => row.fixedExpenseId || (row.subscriptionId ? linkedFixed.get(row.subscriptionId) : null);
  const fixedIds = new Set(input.fixed.map(row => row.id)), subscriptionIds = new Set(input.subscriptions.map(row => row.id));
  const handled = new Set<string>();
  const actualPurchase = (row: ForecastTransaction) => row.isConsumption && ["EXPENSE", "REFUND"].includes(row.type);
  function addFixed(month: string, key: string, label: string, amount: number, accountId: string | null, dueDay: number | null, covered: number, extra: number, pending: boolean) {
    const consumption = result.get(month); if (consumption) consumption.fixedConsumptionCents += amount;
    const uncovered = Math.max(0, amount - covered), account = accountId ? accounts.get(accountId) : undefined;
    const timing = account?.type === "CREDIT_CARD" && dueDay ? forecastBillingMonth(projectionDate(month, dueDay), account) : { month, estimated: account?.type === "CREDIT_CARD", missing: account?.type === "CREDIT_CARD" };
    const target = result.get(timing.month);
    if (target) {
      target.fixedOutsideBillsCents += uncovered; target.uncertainFixedExtraCents += extra;
      if (uncovered) target.sources.push({ key: `${key}:${month}`, kind: "FIXED_PLAN", label, cents: uncovered, accountId, estimated: true });
      if (timing.missing && uncovered) target.issues.push("CARD_CYCLE_UNKNOWN");
      if (pending) target.issues.push("FIXED_UNCONFIRMED");
    }
    if (consumption) consumption.fixedIncludedInBillsCents += Math.min(amount, covered);
  }
  for (const month of sourceMonths) for (const plan of plannedActiveIn(input.fixed, month)) {
    const purchases = input.transactions.filter(row => actualPurchase(row) && fixedForTransaction(row) === plan.id && (row.purchasedDate || row.date).startsWith(month) && (!plan.cardAccountId || row.accountId === plan.cardAccountId));
    purchases.forEach(row => handled.add(row.id));
    const actual = purchases.reduce((sum, row) => sum + (row.type === "REFUND" ? -1 : 1) * row.amountCents, 0);
    const amount = Math.max(plan.amountCents + (plan.safetyMarginCents ?? 0), actual);
    const covered = Math.max(0, purchases.filter(row => row.cardStatementId && statements.get(row.cardStatementId)?.kind === "STATEMENT").reduce((sum, row) => sum + (row.type === "REFUND" ? -1 : 1) * row.amountCents, 0));
    addFixed(month, plan.id, plan.name, amount, plan.cardAccountId || plan.paymentAccountId || null, plan.dueDay, covered, Math.max(0, (plan.expectedMaxCents ?? plan.amountCents) - amount), plan.confirmationStatus === "PENDING");
  }
  for (const subscription of input.subscriptions.filter(row => !row.fixedExpenseId || !fixedIds.has(row.fixedExpenseId))) {
    const coverageLeft = new Map<string, number>();
    const originalDay = Number(subscription.nextChargeDate.slice(8)); let charge = subscription.nextChargeDate;
    const advance = () => {
      if (subscription.billingCycle === "WEEKLY" || subscription.billingCycle === "CUSTOM") return new Date(Date.parse(charge + "T00:00:00Z") + (subscription.billingCycle === "WEEKLY" ? 7 : Math.max(1, subscription.customDays ?? 30)) * 86400000).toISOString().slice(0, 10);
      const step = subscription.billingCycle === "YEARLY" ? 12 : subscription.billingCycle === "QUARTERLY" ? 3 : 1;
      const next = new Date(Date.UTC(Number(charge.slice(0, 4)), Number(charge.slice(5, 7)) - 1 + step, 1)).toISOString().slice(0, 7);
      return projectionDate(next, originalDay);
    };
    for (let guard = 0; guard < 1600 && charge <= sourceMonths.at(-1)! + "-31"; guard++, charge = advance()) {
      if (charge < sourceMonths[0] + "-01") continue;
      const month = charge.slice(0, 7), purchases = input.transactions.filter(row => actualPurchase(row) && row.subscriptionId === subscription.id && (row.purchasedDate || row.date).startsWith(month));
      purchases.forEach(row => handled.add(row.id));
      if (!coverageLeft.has(month)) coverageLeft.set(month, Math.max(0, purchases.filter(row => row.cardStatementId && statements.get(row.cardStatementId)?.kind === "STATEMENT").reduce((sum, row) => sum + (row.type === "REFUND" ? -1 : 1) * row.amountCents, 0)));
      const covered = Math.min(subscription.amountCents, coverageLeft.get(month)!);
      coverageLeft.set(month, coverageLeft.get(month)! - covered);
      addFixed(month, subscription.id, subscription.name, subscription.amountCents, subscription.accountId, Number(charge.slice(8)), covered, 0, false);
    }
  }
  for (const row of input.transactions) {
    if (row.type === "INCOME" && row.source !== "QUICK_INCOME" && row.date <= input.today) { const month = result.get(row.date.slice(0, 7)); if (month) month.receivedCents += row.amountCents; }
    if (!row.isConsumption || !["EXPENSE", "REFUND"].includes(row.type)) continue;
    if (handled.has(row.id)) continue;
    if (fixedForTransaction(row) && fixedIds.has(fixedForTransaction(row)!) || row.subscriptionId && subscriptionIds.has(row.subscriptionId) || row.recurring) {
      const cents = (row.type === "REFUND" ? -1 : 1) * row.amountCents, month = (row.purchasedDate || row.date).slice(0, 7);
      const covered = row.cardStatementId && statements.get(row.cardStatementId)?.kind === "STATEMENT" ? Math.max(0, cents) : 0;
      addFixed(month, row.id, row.description, cents, row.accountId, Number((row.purchasedDate || row.date).slice(8)), covered, 0, false);
      if (fixedForTransaction(row)) result.get(month)?.issues.push("FIXED_EXECUTION_OUTSIDE_PLAN");
      continue;
    }
    const cents = row.type === "REFUND" ? -row.amountCents : row.amountCents, purchaseDate = row.purchasedDate || row.date, consumption = result.get(purchaseDate.slice(0, 7));
    if (consumption) consumption.variableActualCents += cents;
    const account = accounts.get(row.accountId);
    if (account?.type === "CREDIT_CARD" && row.cardStatementId && statements.get(row.cardStatementId)?.kind === "STATEMENT") continue;
    const timing = forecastBillingMonth(account?.type === "CREDIT_CARD" ? purchaseDate : row.date, account), cash = result.get(timing.month);
    if (cash) {
      cash.variableCashCents += cents; cash.sources.push({ key: row.id, kind: "CONFIRMED_TRANSACTION", label: row.description, cents, accountId: row.accountId, estimated: timing.estimated });
      if (timing.missing) cash.issues.push("CARD_CYCLE_UNKNOWN");
      if (account?.type === "CREDIT_CARD" && !row.cardStatementId) cash.issues.push("UNLINKED_CARD_PURCHASE");
    }
  }
  const carry = new Map<string, { name: string; cents: number; accountId: string; dueDay: number }>();
  for (const row of input.transactions.filter(row => actualPurchase(row) && row.recurring && !fixedForTransaction(row) && !row.subscriptionId && (row.purchasedDate || row.date).startsWith(input.today.slice(0, 7)))) {
    const key = `${row.accountId}:${commitmentMerchant(row.merchant || row.description)}`, previous = carry.get(key);
    carry.set(key, { name: row.description, cents: (previous?.cents ?? 0) + (row.type === "REFUND" ? -1 : 1) * row.amountCents, accountId: row.accountId, dueDay: Number((row.purchasedDate || row.date).slice(8)) });
  }
  for (const month of sourceMonths.filter(month => month > input.today.slice(0, 7))) for (const [key, row] of carry) if (row.cents > 0) addFixed(month, `recurring:${key}`, row.name, row.cents, row.accountId, row.dueDay, 0, 0, false);
  const addVariable = (month: string, cents: number, accountId: string | null, label: string, dueMonth?: string) => {
    if (cents <= 0) return;
    const account = accountId ? accounts.get(accountId) : undefined;
    const timing = dueMonth ? { month: dueMonth, estimated: false } : forecastBillingMonth(projectionDate(month, 15), account);
    const row = result.get(timing.month); if (!row) return;
    row.variablePlannedCents += cents; row.sources.push({ key: `variable:${label}:${month}`, kind: "VARIABLE_BUDGET", label, cents, accountId, estimated: true });
    if (timing.missing) row.issues.push("CARD_CYCLE_UNKNOWN");
  };
  for (const month of months) {
    const override = overrides.get(month), row = result.get(month)!;
    row.variableActualCents = Math.max(0, row.variableActualCents);
    if (override?.variableBudgetCents !== null && override?.variableBudgetCents !== undefined) addVariable(month, Math.max(0, override.variableBudgetCents - row.variableActualCents), override.variableCardAccountId, "Orçamento variável do mês");
  }
  // A global cap bounds overlapping account caps; overlapping limits are never summed as independent expenses.
  const accepted: { limit: Limit; remainingCents: number }[] = [];
  const expanded = input.limits.flatMap(entry => entry.limit.recurring ? months.filter(month => month >= entry.limit.startDate.slice(0, 7)).map(month => { const window = limitWindow(entry.limit, month); return { limit: { ...entry.limit, startDate: window.start, endDate: window.end }, remainingCents: window.initial ? entry.remainingCents : spendingLimitUsage(entry.limit, input.transactions, entry.decisions ?? [], input.today, month).remainingCents }; }) : [entry]);
  for (const entry of expanded.filter(entry => entry.limit.status === "ACTIVE" && entry.limit.endDate >= months[0] + "-01").sort((a, b) => Number(b.limit.scope === "GLOBAL") - Number(a.limit.scope === "GLOBAL") || a.remainingCents - b.remainingCents)) {
    const limit = entry.limit;
    const overlaps = accepted.some(other => other.limit.startDate <= limit.endDate && other.limit.endDate >= limit.startDate && (other.limit.scope === "GLOBAL" || limit.scope === "GLOBAL" || (!(other.limit.filterCategoryIds.length && limit.filterCategoryIds.length && !other.limit.filterCategoryIds.some(id => limit.filterCategoryIds.includes(id))) && other.limit.filterAccountIds.some(id => limit.filterAccountIds.includes(id))) || other.limit.filterCategoryIds.some(id => limit.filterCategoryIds.includes(id))));
    if (overlaps) continue; accepted.push(entry);
    const month = limit.startDate.slice(0, 7) < months[0] ? months[0] : limit.startDate.slice(0, 7), override = overrides.get(month);
    if (override?.variableBudgetCents !== null && override?.variableBudgetCents !== undefined) continue;
    const statement = limit.statementId ? statements.get(limit.statementId) : null;
    addVariable(month, Math.max(0, entry.remainingCents), limit.filterAccountIds.length === 1 ? limit.filterAccountIds[0] : null, "Capacidade restante de limite", statement?.dueDate?.slice(0, 7));
    const row = result.get(statement?.dueDate?.slice(0, 7) || month); if (row) row.issues.push("PARTIAL_PERIOD_BUDGET");
  }
  for (const goal of input.goals.filter(row => row.status === "ACTIVE")) {
    let reserved = goal.currentAmountCents, target = goal.targetAmountCents - (goal.paidAmountCents ?? 0), cycleDate = goal.targetDate, futureCycle = false;
    let dueMonth = cycleDate && cycleDate.slice(0, 7) < months[0] ? months[0] : cycleDate?.slice(0, 7);
    for (const month of months) {
      const row = result.get(month)!;
      if (dueMonth && month > dueMonth) {
        if (goal.recurrence !== "YEARLY" || !cycleDate) break;
        const originalMonth = cycleDate.slice(5, 7), originalDay = Number(cycleDate.slice(8));
        cycleDate = projectionDate(`${Number(cycleDate.slice(0, 4)) + 1}-${originalMonth}`, originalDay);
        while (cycleDate.slice(0, 7) < month) cycleDate = projectionDate(`${Number(cycleDate.slice(0, 4)) + 1}-${originalMonth}`, originalDay);
        dueMonth = cycleDate.slice(0, 7); reserved = 0; target = goal.targetAmountCents; futureCycle = true;
      }
      const planned = goalContributionPlan({ ...goal, paidAmountCents: futureCycle ? 0 : goal.paidAmountCents, targetDate: cycleDate, currentAmountCents: reserved }, month + "-01");
      const contribution = Math.min(Math.max(0, target - reserved), goal.contributionFrequency === "ONE_TIME" && month !== months[0] ? 0 : planned.chosenCents);
      if (contribution) { row.reservesCents += contribution; row.sources.push({ key: `${goal.id}:${month}`, kind: "SAVINGS_ALLOCATION", label: goal.name, cents: contribution }); reserved += contribution; }
      if (futureCycle) row.issues.push("GOAL_RECURRENCE_ESTIMATE");
      if (dueMonth === month) { row.otherOutflowCents += Math.max(0, target); row.fundedGoalUseCents += Math.min(Math.max(0, target), reserved); row.sources.push({ key: `goal-payment:${goal.id}:${month}`, kind: "ONE_TIME_OBLIGATION", label: goal.name, cents: Math.max(0, target), estimated: futureCycle }); if (reserved < target) row.issues.push("GOAL_UNFUNDED"); if (cycleDate! < input.today) row.issues.push("GOAL_OVERDUE"); }
    }
  }
  const reduction = Math.min(100, Math.max(0, input.economicReductionPercent ?? 20));
  for (const row of result.values()) {
    const cashOut = row.billsCents + row.fixedOutsideBillsCents + row.variableCashCents + row.variablePlannedCents + row.otherOutflowCents;
    row.issues = [...new Set(row.issues)];
    if (input.statements.some(statement => statement.payments?.some(payment => payment.bankReconciliation === "UNRECONCILED" && (!payment.date || payment.date.startsWith(row.month))))) row.issues.push("BANK_RECONCILIATION_PENDING");
    if (row.incomeCents !== null) row.sources.push({ key: `income:${row.month}`, kind: "EXPECTED_INCOME", label: "Receita prevista", cents: row.incomeCents, estimated: true });
    const override = overrides.get(row.month);
    if (override?.otherOutflowCents) row.sources.push({ key: `other:${row.month}`, kind: "ONE_TIME_OBLIGATION", label: override.otherOutflowDescription || "Outras saídas previstas", cents: override.otherOutflowCents, estimated: true });
    if (row.incomeCents !== null) {
      row.cashSurplusCents = row.incomeCents - cashOut;
      row.surplusCents = row.cashSurplusCents - row.reservesCents + row.fundedGoalUseCents;
      row.conservativeCents = row.surplusCents - row.uncertainFixedExtraCents - row.extraExpectedCents;
      row.economicCents = row.surplusCents + Math.floor(row.variablePlannedCents * reduction / 100);
    }
  }
  return [...result.values()];
}
