import "server-only";
import { prisma } from "@/lib/prisma";
import { dateOnly } from "../money";
import { monthKeys, type SalaryPlanView, type StatementLite } from "../salary-plan";
import { buildFinancialForecast, type ForecastAccount, type ForecastFixed, type ForecastSubscription } from "./forecast";
import { spendingLimitUsage, type Limit } from "./spending-limits";
import type { GoalPlan } from "./goals";
import { transactionOriginWhere, type FinanceOrigin } from "../data-origin";

/** Same projection engine as the dedicated screen; no full ledger is serialized to the dashboard. */
export async function addSalaryPlanning(workspaceId: string, today: string, salary: SalaryPlanView, input: { accounts: ForecastAccount[]; fixed: ForecastFixed[]; subscriptions: ForecastSubscription[]; statements: StatementLite[]; goals: GoalPlan[]; incomeCents: number | null }, origin: FinanceOrigin = "combined") {
  const months = salary.months.map(row => row.month), start = dateOnly(months[0] + "-01"), end = dateOnly(monthKeys(months.at(-1)! + "-01", 3)[2] + "-01");
  const [overrides, budgets] = await Promise.all([
    prisma.monthlyFinancialPlan.findMany({ where: { workspaceId, month: { gte: months[0], lte: months.at(-1)! } } }),
    prisma.budget.findMany({ where: { workspaceId, kind: "SPENDING_LIMIT", status: "ACTIVE", OR: [{ startDate: { lt: end }, endDate: { gte: start } }, { recurring: true }] }, include: { transactionReviews: { select: { transactionId: true, decision: true } } }, take: 100 }),
  ]);
  if (!overrides.length && !budgets.length && !input.goals.some(goal => goal.targetDate || goal.monthlyContributionCents)) return salary;
  const previousStart = dateOnly(new Date(Date.UTC(Number(months[0].slice(0,4)), Number(months[0].slice(5,7))-2, 1)).toISOString().slice(0,10));
  const baseline = budgets.reduce((day, row) => row.startDate < day ? row.startDate : day, previousStart);
  const transactionRows = await prisma.financeTransaction.findMany({ where: { workspaceId, currency: "BRL", source: { not: "QUICK_INCOME" }, OR: [{ date: { gte: baseline, lt: end } }, { purchasedDate: { gte: baseline, lt: end } }], AND: transactionOriginWhere(origin) }, take: 50001, orderBy: { id: "asc" } });
  const day = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null;
  const transactions = transactionRows.slice(0, 50000).map(row => ({ ...row, date: day(row.date)!, purchasedDate: day(row.purchasedDate), occurredAt: row.occurredAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() }));
  const limits = budgets.map(row => { const limit: Limit = { ...row, startDate: day(row.startDate)!, endDate: day(row.endDate)!, baselineAt: row.baselineAt?.toISOString() ?? null, baselineDate: day(row.baselineDate) }; return { limit, decisions: row.transactionReviews, remainingCents: spendingLimitUsage(limit, transactions, row.transactionReviews, today, row.recurring ? today.slice(0, 7) : undefined).remainingCents }; });
  const forecast = buildFinancialForecast({ today, startsOn: months[0] + "-01", count: months.length, incomeDefaultCents: input.incomeCents, ...input, transactions, overrides, limits, dataTruncated: transactionRows.length > 50000 });
  return { ...salary, months: salary.months.map((month, index) => {
    const projection = forecast[index];
    return { ...month, incomeCents: projection.incomeCents ?? 0, incomeKnown: projection.incomeCents !== null, planningIssues: projection.issues,
      cashItems: projection.sources.filter(row => row.kind === "FIXED_PLAN").map(row => ({ kind: "FIXED" as const, id: row.key, name: row.label, cents: row.cents, cardId: row.accountId })),
      variableCents: Math.max(0, projection.variableCashCents + projection.variablePlannedCents), variablesKnown: !projection.issues.includes("VARIABLE_BUDGET_UNKNOWN"),
      additionalCommitments: [
        { key: "planning-reserves", kind: "RESERVE" as const, label: "Novas reservas para objetivos", cents: projection.reservesCents },
        { key: "planning-other", kind: "PLANNED" as const, label: "Despesas eventuais sem reserva", cents: Math.max(0, projection.otherOutflowCents - projection.fundedGoalUseCents) },
      ].filter(row => row.cents > 0) };
  }) };
}
