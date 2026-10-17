import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
const state = vi.hoisted(() => ({ actor: { workspaceId: "", userId: "", role: "OWNER", workspace: { timezone: "America/Manaus" } } }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/workspace", () => ({ requirePermission: async () => state.actor, AuthorizationError: class extends Error {} }));
vi.mock("@/lib/tenancy/requirePermission", () => ({ requirePermission: async () => state.actor, AuthorizationError: class extends Error {} }));
vi.mock("@/lib/prisma", async () => {
  const { PrismaClient } = await import("@prisma/client");
  const url = process.env.FINANCE_PLANNING_TEST_DB_URL;
  if (url && !/^\/tbb_(planning_sprint_qa|planning_test)$/.test(new URL(url).pathname)) throw new Error("Explicit disposable planning database required");
  return { prisma: new PrismaClient({ datasourceUrl: url ?? "postgresql://test:test@localhost:1/tbb_planning_test" }) };
});
import { prisma } from "@/lib/prisma";
import { saveFixedExpense, saveGridTransactions } from "../actions";
import { cardStatementRows, financeSummary } from "../queries";
import { applyStatementPayment, undoStatementPayment } from "../statement-payment-service";
import { saveFutureGoal, recordGoalContribution, saveMonthlyForecast, saveSpendingLimit, reviewLimitTransaction } from "../planning/actions";
import { financialPlanningData } from "../planning/query";
const form = (data: Record<string, string | string[]>) => { const fd = new FormData(); for (const [key, value] of Object.entries(data)) for (const item of Array.isArray(value) ? value : [value]) fd.append(key, item); return fd; };
describe.skipIf(!process.env.FINANCE_PLANNING_TEST_DB_URL)("financial planning in disposable PostgreSQL", () => {
  let bankId: string, cardId: string, reserveId: string, foreignId: string, billId: string;
  const today = "2032-10-15";
  const bankBalance = async () => (await financeSummary(state.actor.workspaceId, today)).accounts.find(row => row.id === bankId)!.balanceCents;
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(today + "T16:00:00Z"));
    const key = randomUUID();
    const user = await prisma.user.create({ data: { email: `planning-${key}@example.invalid`, name: "Synthetic planning", passwordHash: "test-only" } });
    const workspace = await prisma.workspace.create({ data: { name: "Synthetic planning", slug: `planning-${key}`, memberships: { create: { userId: user.id, role: "OWNER" } } } });
    state.actor = { workspaceId: workspace.id, userId: user.id, role: "OWNER", workspace: { timezone: "America/Manaus" } };
    bankId = (await prisma.account.create({ data: { workspaceId: workspace.id, name: "Synthetic debit", type: "CHECKING", initialBalanceCents: 100000 } })).id;
    reserveId = (await prisma.account.create({ data: { workspaceId: workspace.id, name: "Synthetic reserve", type: "SAVINGS" } })).id;
    cardId = (await prisma.account.create({ data: { workspaceId: workspace.id, name: "Synthetic credit", type: "CREDIT_CARD", closingDay: 26, dueDay: 3 } })).id;
    billId = (await prisma.cardStatement.create({ data: { workspaceId: workspace.id, accountId: cardId, kind: "STATEMENT", status: "OPEN", amountCents: 10000, dueDate: new Date("2032-11-03"), closingDate: new Date("2032-10-26"), periodKey: "due:2032-11-03", externalKey: "synthetic-" + key, sourceRecordType: "CURRENT_STATEMENT", sourceAsOf: new Date("2032-10-01") } })).id;
    foreignId = (await prisma.workspace.create({ data: { name: "Synthetic foreign", slug: `foreign-${key}` } })).id;
  }, 30000);
  afterAll(async () => { vi.useRealTimers(); await prisma.$disconnect(); });
  it("adds new grid card purchases to the open bill and editing the same row does not add it twice", async () => {
    expect(await saveGridTransactions([{ id: "draft-" + randomUUID(), accountId: cardId, date: "2032-10-14", description: "Synthetic new card purchase", type: "EXPENSE", amount: "12,00" }])).toHaveProperty("success");
    let rows = await cardStatementRows(state.actor as Parameters<typeof cardStatementRows>[0]); expect(rows.find(row => row.id === billId)?.amountCents).toBe(11200);
    const row = await prisma.financeTransaction.findFirstOrThrow({ where: { workspaceId: state.actor.workspaceId, description: "Synthetic new card purchase" } });
    expect(await saveGridTransactions([{ id: row.id, accountId: cardId, date: "2032-10-14", description: row.description, type: "EXPENSE", amount: "20,00" }])).toHaveProperty("success");
    rows = await cardStatementRows(state.actor as Parameters<typeof cardStatementRows>[0]); expect(rows.find(row => row.id === billId)?.amountCents).toBe(12000); expect((await prisma.cardStatement.findUniqueOrThrow({ where: { id: billId } })).amountCents).toBe(10000);
  });
  it("deducts an ordinary debit purchase exactly once from its bank account", async () => {
    const before = await bankBalance();
    expect(await saveGridTransactions([{ id: "draft-" + randomUUID(), accountId: bankId, date: "2032-10-14", description: "Synthetic debit purchase", type: "EXPENSE", amount: "6,00" }])).toHaveProperty("success");
    expect(await bankBalance()).toBe(before - 600);
  });
  it("creates an optional settlement transfer without duplicate consumption and safely undoes it", async () => {
    const bill = await prisma.cardStatement.findUniqueOrThrow({ where: { id: billId } }), before = await bankBalance(), count = await prisma.financeTransaction.count({ where: { workspaceId: state.actor.workspaceId, isConsumption: true } });
    const input = { statementId: billId, version: bill.updatedAt.toISOString(), mode: "FULL" as const, amountCents: null, paidOn: "2032-10-14", unknownDate: false, nextStatementId: null, carryIncluded: false, confirmed: true, token: randomUUID(), today, bank: { mode: "CREATED" as const, accountId: bankId } };
    await prisma.$transaction(tx => applyStatementPayment(tx, state.actor, input), { isolationLevel: "Serializable" });
    expect(await bankBalance()).toBe(before - 12000); expect(await prisma.financeTransaction.count({ where: { workspaceId: state.actor.workspaceId, isConsumption: true } })).toBe(count);
    await prisma.$transaction(tx => applyStatementPayment(tx, state.actor, input), { isolationLevel: "Serializable" }); expect(await bankBalance()).toBe(before - 12000);
    const paid = await prisma.cardStatement.findUniqueOrThrow({ where: { id: billId } });
    await prisma.$transaction(tx => undoStatementPayment(tx, state.actor, { statementId: billId, version: paid.updatedAt.toISOString(), confirmed: true }), { isolationLevel: "Serializable" });
    expect(await bankBalance()).toBe(before); expect((await prisma.cardStatement.findUniqueOrThrow({ where: { id: billId } })).status).toBe("OPEN");
  });
  it("links an already posted bank transfer without creating a second debit", async () => {
    const movement = await prisma.financeTransaction.create({ data: { workspaceId: state.actor.workspaceId, accountId: bankId, destinationAccountId: cardId, type: "TRANSFER", amountCents: 1000, date: new Date("2032-10-14"), description: "Synthetic existing settlement", isConsumption: false, eventKind: "CARD_SETTLEMENT" } });
    const before = await bankBalance(), bill = await prisma.cardStatement.findUniqueOrThrow({ where: { id: billId } });
    await prisma.$transaction(tx => applyStatementPayment(tx, state.actor, { statementId: billId, version: bill.updatedAt.toISOString(), mode: "PARTIAL", amountCents: 1000, paidOn: "2032-10-14", unknownDate: false, nextStatementId: null, carryIncluded: false, confirmed: true, token: randomUUID(), today, bank: { mode: "LINKED", transactionId: movement.id } }), { isolationLevel: "Serializable" });
    expect(await bankBalance()).toBe(before); expect(await prisma.cardStatementPayment.count({ where: { bankTransactionId: movement.id } })).toBe(1);
  });
  it("refuses a second Gympass/Wellhub plan and stores a PIX plan without debiting its account", async () => {
    await prisma.fixedExpense.create({ data: { workspaceId: state.actor.workspaceId, name: "Wellhub", amountCents: 20000 } });
    expect(await saveFixedExpense(form({ name: "Gympass", amount: "200,00", paymentMethod: "UNKNOWN" }))).toHaveProperty("error");
    expect(await prisma.fixedExpense.count({ where: { workspaceId: state.actor.workspaceId } })).toBe(1);
    const before = await bankBalance();
    expect(await saveFixedExpense(form({ name: "Synthetic temporary PIX", amount: "55,00", paymentMethod: "PIX", paymentAccountId: bankId, dueDay: "1", startsOn: "2032-11-01", endsOn: "2032-12-02" }))).toHaveProperty("success");
    expect(await bankBalance()).toBe(before);
  });
  it("keeps forecasts and pending unconfirmed insurance reviews outside the ledger", async () => {
    const count = await prisma.financeTransaction.count({ where: { workspaceId: state.actor.workspaceId } });
    expect(await saveMonthlyForecast(form({ month: "2032-12", income: "0", extraIncome: "100", extraIncomeStatus: "EXPECTED", variableBudget: "1000" }))).toHaveProperty("success");
    await prisma.financePlanningReview.create({ data: { workspaceId: state.actor.workspaceId, fingerprint: "synthetic-insurance", subjectKind: "HISTORICAL_CHARGE", title: "Synthetic insurance requires current amount and card", status: "PENDING" } });
    const data = await financialPlanningData(state.actor, today, "2032-10-01", 6);
    expect(data.reviews.some(row => row.status === "PENDING")).toBe(true); expect(data.forecast.find(row => row.month === "2033-01")!.sources.some(row => row.label === "Synthetic temporary PIX")).toBe(false);
    expect(await prisma.financeTransaction.count({ where: { workspaceId: state.actor.workspaceId } })).toBe(count);
  });
  it("creates an incremental baseline, flags same-day unknown times and applies reviewed decisions", async () => {
    expect(await saveSpendingLimit(form({ name: "Synthetic incremental", limit: "400", scope: "GLOBAL", startsOn: today, endsOn: "2032-10-25", incremental: "on", excludeFixed: "on" }))).toHaveProperty("success");
    const budget = await prisma.budget.findFirstOrThrow({ where: { workspaceId: state.actor.workspaceId, kind: "SPENDING_LIMIT" } });
    const expense = await prisma.financeTransaction.create({ data: { workspaceId: state.actor.workspaceId, accountId: bankId, amountCents: 1000, type: "EXPENSE", date: new Date(today), description: "Synthetic new spending", source: "MANUAL" } });
    let data = await financialPlanningData(state.actor, today, "2032-10-01", 3); expect(data.limits[0].usage.pendingReviewCount).toBe(1);
    expect(await reviewLimitTransaction(form({ budgetId: budget.id, transactionId: expense.id, decision: "COUNT" }))).toHaveProperty("success");
    data = await financialPlanningData(state.actor, today, "2032-10-01", 3); expect(data.limits[0].usage.usedNowCents).toBe(1000); expect(data.limits[0].usage.remainingCents).toBe(39000);
  });
  it("earmarks reserves without changing cash or wealth and records actual reserve transfers separately", async () => {
    expect(await saveFutureGoal(form({ name: "Synthetic vehicle tax", kind: "IPVA", targetAmount: "180", currentAmount: "0", targetDate: "2032-12-20", monthlyContribution: "60", linkedAccountId: reserveId }))).toHaveProperty("success");
    let goal = await prisma.savingsGoal.findFirstOrThrow({ where: { workspaceId: state.actor.workspaceId, kind: "IPVA" } });
    const before = await bankBalance(), count = await prisma.financeTransaction.count({ where: { workspaceId: state.actor.workspaceId } }), token = randomUUID();
    const allocation = form({ goalId: goal.id, version: String(goal.version), amount: "60", date: today, kind: "ALLOCATION", confirm: "on", token });
    expect(await recordGoalContribution(allocation)).toHaveProperty("success"); expect(await recordGoalContribution(allocation)).toHaveProperty("success");
    expect(await bankBalance()).toBe(before); expect(await prisma.financeTransaction.count({ where: { workspaceId: state.actor.workspaceId } })).toBe(count);
    goal = await prisma.savingsGoal.findUniqueOrThrow({ where: { id: goal.id } }); expect(goal.currentAmountCents).toBe(6000);
    expect(await recordGoalContribution(form({ goalId: goal.id, version: String(goal.version), amount: "40", date: today, kind: "TRANSFER", accountId: bankId, confirm: "on", token: randomUUID() }))).toHaveProperty("success");
    const summary = await financeSummary(state.actor.workspaceId, today); expect(summary.accounts.find(row => row.id === reserveId)!.balanceCents).toBe(4000); expect(await bankBalance()).toBe(before - 4000);
    expect(await prisma.financeTransaction.count({ where: { workspaceId: state.actor.workspaceId, source: "SAVINGS_GOAL", isConsumption: true } })).toBe(0);
  });
  it("leaves debt principal unchanged until an actual confirmed amortization payment", async () => {
    const debt = await prisma.debt.create({ data: { workspaceId: state.actor.workspaceId, name: "Synthetic debt", originalAmountCents: 50000, remainingBalanceCents: 50000, minimumPaymentCents: 1000, startDate: new Date(today) } });
    expect(await saveFutureGoal(form({ name: "Synthetic amortization", kind: "DEBT_AMORTIZATION", targetAmount: "100", currentAmount: "100", debtId: debt.id }))).toHaveProperty("success");
    expect((await prisma.debt.findUniqueOrThrow({ where: { id: debt.id } })).remainingBalanceCents).toBe(50000);
    const goal = await prisma.savingsGoal.findFirstOrThrow({ where: { workspaceId: state.actor.workspaceId, debtId: debt.id } });
    const fields = { goalId: goal.id, version: String(goal.version), amount: "100", date: today, kind: "PAYMENT", accountId: bankId, token: randomUUID() };
    expect(await recordGoalContribution(form(fields))).toHaveProperty("error"); expect(await recordGoalContribution(form({ ...fields, confirm: "on" }))).toHaveProperty("success");
    expect((await prisma.debt.findUniqueOrThrow({ where: { id: debt.id } })).remainingBalanceCents).toBe(40000);
  });
  it("rejects cross-workspace references in both actions and composite database constraints", async () => {
    const foreign = await prisma.account.create({ data: { workspaceId: foreignId, name: "Foreign bank", type: "CHECKING" } });
    expect(await saveFutureGoal(form({ name: "Foreign reference", targetAmount: "100", currentAmount: "0", linkedAccountId: foreign.id }))).toHaveProperty("error");
    const fixed = await prisma.fixedExpense.create({ data: { workspaceId: foreignId, name: "Foreign fixed", amountCents: 1000 } });
    await expect(prisma.financeTransaction.create({ data: { workspaceId: state.actor.workspaceId, accountId: bankId, fixedExpenseId: fixed.id, type: "EXPENSE", amountCents: 1000, date: new Date(today), description: "Foreign fixed link" } })).rejects.toThrow();
  });
});
