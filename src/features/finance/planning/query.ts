import "server-only";
import { prisma } from "@/lib/prisma";
import { cardStatementRows } from "../queries";
import { dateOnly } from "../money";
import { monthKeys } from "../salary-plan";
import { buildFinancialForecast, type ForecastTransaction } from "./forecast";
import { spendingLimitUsage, type Limit } from "./spending-limits";
import { fixedExecution, matchFixedCommitment, commitmentMerchant } from "./fixed-matching";
import { plannedActiveIn } from "../fixed-expenses";
import { goalContributionPlan } from "./goals";

export function forecastSelection(month: unknown, horizon: unknown, today: string) {
  const startsOn = typeof month === "string" && /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month) ? month + "-01" : today.slice(0, 7) + "-01";
  const count = [3, 6, 12, 24].includes(Number(horizon)) ? Number(horizon) : 12;
  return { startsOn, count };
}
export async function financialPlanningData(viewer: { workspaceId: string; role: string }, today: string, startsOn: string, count: number) {
  if (viewer.role !== "OWNER") throw new Error("Planejamento detalhado é privado do titular.");
  const workspaceId = viewer.workspaceId, months = monthKeys(startsOn, Math.min(24, Math.max(1, count)));
  const from = dateOnly(monthKeys(new Date(Date.UTC(Number(startsOn.slice(0, 4)), Number(startsOn.slice(5, 7)) - 2, 1)).toISOString().slice(0, 10), 1)[0] + "-01");
  // Include the baseline periods and current-month recurrence evidence, but never load the entire history.
  const todayStart = dateOnly(today.slice(0, 7) + "-01");
  let rangeStart = from < todayStart ? from : todayStart;
  const historyStart = dateOnly(new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7))-6,1)).toISOString().slice(0,10));
  if (historyStart < rangeStart) rangeStart = historyStart;
  const until = dateOnly(monthKeys(months.at(-1)! + "-01", 3)[2] + "-01");
  const budgetRows = await prisma.budget.findMany({ where: { workspaceId, kind: "SPENDING_LIMIT", OR: [{ status: { in: ["ACTIVE", "PAUSED"] } }, { startDate: { lt: until }, endDate: { gte: rangeStart } }] }, include: { transactionReviews: { select: { transactionId: true, decision: true } } }, orderBy: [{ status: "asc" }, { startDate: "asc" }], take: 100 });
  rangeStart = budgetRows.reduce((earliest, row) => !row.recurring && row.startDate < earliest ? row.startDate : earliest, rangeStart);
  const [accounts, fixedRows, subscriptionRows, statements, transactionRows, plan, overrides, goalRows, reviews, categories, bankCandidates] = await Promise.all([
    prisma.account.findMany({ where: { workspaceId, isArchived: false }, select: { id: true, name: true, institution: true, type: true, closingDay: true, dueDay: true } }),
    prisma.fixedExpense.findMany({ where: { workspaceId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.subscription.findMany({ where: { workspaceId, status: "ACTIVE" } }),
    cardStatementRows({ workspaceId, role: "OWNER" }),
    prisma.financeTransaction.findMany({ where: { workspaceId, currency: "BRL", source: { not: "QUICK_INCOME" }, OR: [{ date: { gte: rangeStart, lt: until } }, { purchasedDate: { gte: rangeStart, lt: until } }] }, orderBy: [{ date: "desc" }, { id: "desc" }], take: 50001 }),
    prisma.financePlan.findUnique({ where: { workspaceId } }),
    prisma.monthlyFinancialPlan.findMany({ where: { workspaceId, month: { gte: months[0], lte: months.at(-1)! } }, orderBy: { month: "asc" } }),
    prisma.savingsGoal.findMany({ where: { workspaceId }, include: { contributions: { select: { amountCents: true, date: true, kind: true } } }, orderBy: [{ priority: "asc" }, { targetDate: "asc" }] }),
    prisma.financePlanningReview.findMany({ where: { workspaceId }, select: { id: true, subjectKind: true, subjectId: true, fixedExpenseId: true, title: true, status: true, confidence: true, notes: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.financeCategory.findMany({ where: { workspaceId, isArchived: false }, select: { id: true, name: true } }),
    prisma.financeTransaction.findMany({ where: { workspaceId, account: { type: { in: ["CHECKING", "SAVINGS", "CASH", "DIGITAL_WALLET"] } }, date: { lte: dateOnly(today) }, bankStatementPayment: null, OR: [{ type: "TRANSFER", destinationAccount: { type: "CREDIT_CARD" } }, { type: "EXPENSE", isConsumption: false, eventKind: { in: ["CARD_SETTLEMENT", "CARD_PAYMENT"] } }] }, select: { id: true, description: true, date: true, amountCents: true, destinationAccountId: true }, orderBy: { date: "desc" }, take: 100 }),
  ]);
  const day = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null;
  const fixed = fixedRows.map(({ pixKeyEncrypted, ...row }) => ({ ...row, hasPixKey: Boolean(pixKeyEncrypted), startsOn: day(row.startsOn), endsOn: day(row.endsOn) }));
  const subscriptions = subscriptionRows.map(row => ({ ...row, nextChargeDate: day(row.nextChargeDate)!, updatedAt: row.updatedAt.toISOString() }));
  const transactions: ForecastTransaction[] = transactionRows.slice(0, 50000).map(row => ({ ...row, date: day(row.date)!, purchasedDate: day(row.purchasedDate), occurredAt: row.occurredAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() }));
  const transactionById = new Map(transactions.map(row => [row.id, row]));
  const limits = budgetRows.map(row => {
    const limit: Limit = { ...row, startDate: day(row.startDate)!, endDate: day(row.endDate)!, baselineAt: row.baselineAt?.toISOString() ?? null, baselineDate: day(row.baselineDate) };
    const usage = spendingLimitUsage(limit, transactions, row.transactionReviews, today, row.recurring ? today.slice(0, 7) : undefined);
    return { ...limit, name: row.name || "Limite", notes: row.notes, version: row.version, usage: { ...usage, transactionIds: undefined,
      pending: usage.pending.slice(0, 50).map(item => ({ ...item, description: transactionById.get(item.id)?.description || "Lançamento", amountCents: transactionById.get(item.id)?.amountCents ?? 0, date: transactionById.get(item.id)?.purchasedDate || transactionById.get(item.id)?.date || null })) } };
  });
  const goals = goalRows.map(({ contributions, ...row }) => ({ ...row, targetDate: day(row.targetDate), paidAmountCents: contributions.filter(row => row.kind === "PAYMENT").reduce((sum, row) => sum + row.amountCents, 0),
    contributions: contributions.map(row => ({ ...row, date: day(row.date)! })) }));
  const forecast = buildFinancialForecast({ today, startsOn, count, incomeDefaultCents: plan && plan.incomeCents > 0 ? plan.incomeCents : null,
    accounts, fixed, subscriptions, transactions, statements, overrides, goals,
    limits: limits.map(limit => ({ limit, remainingCents: limit.usage.remainingCents, decisions: budgetRows.find(row => row.id === limit.id)?.transactionReviews ?? [] })), dataTruncated: transactionRows.length > 50000 });
  const decisions = new Set(reviews.filter(review => review.status !== "PENDING").map(review => `${review.subjectKind}:${review.subjectId}:${review.fixedExpenseId}`));
  const suggestions = fixed.flatMap(fixed => [
    ...transactions.slice(0, 1500).filter(row => row.type === "EXPENSE" && row.isConsumption).map(row => ({ row, kind: "TRANSACTION" as const, version: String(transactionById.get(row.id)?.revision ?? 0) })),
    ...subscriptions.map(row => ({ row: { ...row, description: row.name, date: row.nextChargeDate }, kind: "SUBSCRIPTION" as const, version: row.updatedAt })),
  ].flatMap(({ row, kind, version }) => {
    if (row.fixedExpenseId === fixed.id || decisions.has(`${kind}:${row.id}:${fixed.id}`)) return [];
    const match = matchFixedCommitment(fixed, row); return match ? [{ fixedExpenseId: fixed.id, fixedName: fixed.name, fixedVersion: fixed.version, subjectId: row.id, subjectKind: kind, sourceVersion: version, description: row.description, amountCents: row.amountCents, confidence: match.confidence, reasons: match.reasons }] : [];
  })).slice(0, 100);
  const subscriptionPlans = new Map(subscriptions.filter(row=>row.fixedExpenseId).map(row=>[row.id,row.fixedExpenseId]));
  const executionTransactions = transactions.map(row=>row.fixedExpenseId?row:{...row,fixedExpenseId:row.subscriptionId?subscriptionPlans.get(row.subscriptionId):null});
  const execution = plannedActiveIn(fixed,today.slice(0,7)).map(plan => ({ id: plan.id, name: plan.name, ...fixedExecution(plan, executionTransactions, today.slice(0, 7), today) }));
  const executionHistory = monthKeys(historyStart.toISOString().slice(0,10),6).map(month=>({month,items:plannedActiveIn(fixed,month).map(plan=>({id:plan.id,name:plan.name,...fixedExecution(plan,executionTransactions,month,today)}))}));
  const unplannedRecurring = transactions.filter(row=>row.recurring&&!row.fixedExpenseId&&!row.subscriptionId&&row.date.startsWith(today.slice(0,7))).slice(0,100).map(row=>({id:row.id,description:row.description,amountCents:row.amountCents,date:row.date}));
  const subscriptionDuplicates = subscriptions.flatMap((left,index)=>subscriptions.slice(index+1).filter(right=>commitmentMerchant(left.name)===commitmentMerchant(right.name)&&(!left.accountId||!right.accountId||left.accountId===right.accountId)&&Math.abs(left.amountCents-right.amountCents)<=100).map(right=>({id:`${left.id}:${right.id}`,left:left.name,right:right.name,amountCents:left.amountCents}))).slice(0,100);
  const bankPending = statements.flatMap(statement => (statement.payments ?? []).filter(payment => payment.id && !payment.bankTransactionId).map(payment => ({ ...payment, accountName: statement.accountName, statementId: statement.id })));
  return { today, startsOn, count, months, accounts, categories, fixed, subscriptions, statements, overrides, limits, goals: goals.map(goal => ({ ...goal, progress: goalContributionPlan(goal, today) })), reviews, suggestions, execution, executionHistory, unplannedRecurring, subscriptionDuplicates, bankPending, bankCandidates: bankCandidates.map(row => ({ ...row, date: day(row.date)! })),
    forecast, incomeDefaultCents: plan?.incomeCents ?? null, dataTruncated: transactionRows.length > 50000 };
}
export type FinancialPlanningData = Awaited<ReturnType<typeof financialPlanningData>>;
