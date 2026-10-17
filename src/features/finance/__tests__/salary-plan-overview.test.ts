import { beforeEach, describe, expect, it, vi } from "vitest";

// A fake database that answers by what is asked, so the test does not depend on the order of the queries.
const mocks = vi.hoisted(() => {
  const empty = () => vi.fn().mockResolvedValue([]);
  return {
    expenses: [] as unknown[], planned: [] as unknown[], subscriptions: [] as unknown[], statements: [] as unknown[], accounts: [] as { type: string }[],
    db: {
      personalAsset: { findMany: empty() }, financePlan: { findUnique: vi.fn() }, fixedExpense: { findMany: vi.fn() }, cardStatement: { findMany: vi.fn() }, account: { findMany: vi.fn() },
      financeTransaction: { findMany: vi.fn(), groupBy: empty(), findFirst: vi.fn().mockResolvedValue(null) },
      financeCategory: { findMany: empty() }, subscription: { findMany: vi.fn() }, debt: { findMany: empty() }, savingsGoal: { findMany: empty() },
      investmentPosition: { findMany: empty() }, investmentFixedIncomeProfile: { findMany: empty() }, $queryRaw: empty(),
      financialSnapshot: { groupBy: empty() }, activityEvent: { findMany: empty() },
    },
  };
});
vi.mock("../planning/salary-planning",()=>({addSalaryPlanning:async (_workspaceId:unknown,_today:unknown,salary:unknown)=>salary}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));
vi.mock("server-only", () => ({}));
import { financeOverview } from "../overview-query";

// Synthetic figures only. Today is 2032-10-12; the card closes on the 10th and its next bill on the 25th.
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const bank = { id: "bank", name: "Conta sintética", institution: null, type: "CHECKING", initialBalanceCents: 100_000, creditLimitCents: null, closingDay: null, dueDay: null };
const card = { id: "c1", name: "Cartão A", institution: null, type: "CREDIT_CARD", initialBalanceCents: 0, creditLimitCents: 800_000, closingDay: 25, dueDay: 5 };
const statement = (patch: Record<string, unknown>) => ({
  id: "s", createdAt: day("2032-10-01"), updatedAt: day("2032-10-01"), source: "MANUAL_IMPORT", accountId: "c1", kind: "STATEMENT", status: "OPEN", amountCents: 420_000, dueDate: day("2032-10-20"), closingDate: day("2032-10-10"),
  closingDay: null, referenceMonth: "2032-10", paidAt: null, sourceAsOf: day("2032-10-11"), reconciliation: "NOT_REQUIRED", overlapsStatementId: null, notes: null, rolledIntoStatementId: null, amountIsOutstanding: false, payments: [], account: { name: "Cartão A" }, ...patch,
});
const spent = (patch: Record<string, unknown>) => ({ amountCents: 1_000, description: "Compra", merchant: null, recurring: false, subscriptionId: null, accountId: "bank", date: day("2032-10-03"), cardStatementId: null, ...patch });
const planned = (patch: Record<string, unknown>) => ({ id: "f", workspaceId: "w1", name: "Gasto", amountCents: 10_000, dueDay: null, notes: null, isActive: true, endsOn: null, cardAccountId: null, ...patch });
const OWNER = { statementViewer: { workspaceId: "w1", role: "OWNER" as const } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.financePlan.findUnique.mockResolvedValue({ incomeCents: 550_000, payDay: 5, receivingAccountId: null, receivingAccount: null });
  mocks.db.account.findMany.mockImplementation(async (args: { where?: { type?: string } }) => [bank, card].filter((account) => !args?.where?.type || account.type === args.where.type));
  mocks.db.fixedExpense.findMany.mockImplementation(async () => mocks.planned);
  mocks.db.subscription.findMany.mockImplementation(async () => mocks.subscriptions);
  mocks.db.cardStatement.findMany.mockImplementation(async () => mocks.statements);
  // only the query for this month's expenses has this shape
  mocks.db.financeTransaction.findMany.mockImplementation(async (args: { where?: { type?: string; isConsumption?: boolean; date?: unknown } }) => (args?.where?.type === "EXPENSE" && args.where.isConsumption === true && args.where.date ? mocks.expenses : []));
  mocks.planned = []; mocks.subscriptions = []; mocks.statements = []; mocks.expenses = [];
});

describe("the salary plan built from the database", () => {
  it("carries the plan month by month: expenses stop after their end month, and only the cards' own money is linked", async () => {
    mocks.planned = [
      planned({ id: "f1", name: "Claude", amountCents: 12_000, cardAccountId: "c1" }), planned({ id: "f2", name: "Resort", amountCents: 55_000, endsOn: day("2032-11-30") }),
      planned({ id: "f3", name: "Curso encerrado", amountCents: 9_000, endsOn: day("2032-08-31") }), planned({ id: "f4", name: "Banco antigo", amountCents: 7_000, cardAccountId: "bank" }),
    ];
    mocks.subscriptions = [{ id: "s1", name: "Streaming", merchant: null, amountCents: 3_990, billingCycle: "MONTHLY", customDays: null, nextChargeDate: day("2032-10-20"), accountId: "c1" }];
    const data = await financeOverview("w1", "2032-10-12", OWNER);

    // the dialog lists everything that is still registered, with end date and card, ended ones included
    expect(data.plannedFixed.map((row) => [row.name, row.endsOn, row.cardAccountId])).toEqual([["Claude", null, "c1"], ["Resort", "2032-11-30", null], ["Curso encerrado", "2032-08-31", null], ["Banco antigo", null, "bank"]]);
    // an ended expense counts nowhere: not in the "Fixos" figure, not in any month
    expect(data.metrics.fixedCents).toBe(12_000 + 55_000 + 7_000 + 3_990);
    const names = (index: number) => data.salaryPlan.months[index].items.map((entry) => entry.name).sort();
    expect(data.salaryPlan.months.map((month) => month.month)).toEqual(["2032-10", "2032-11", "2032-12", "2033-01", "2033-02", "2033-03"]);
    expect(names(0)).toEqual(["Banco antigo", "Claude", "Resort", "Streaming"]);
    expect(names(1)).toEqual(["Banco antigo", "Claude", "Resort", "Streaming"]);
    expect(names(2)).toEqual(["Banco antigo", "Claude", "Streaming"]); // the resort ended in November
    // a link counts only for a credit card; a subscription is on a card by the account it is charged to
    const card = (index: number, name: string) => data.salaryPlan.months[index].items.find((entry) => entry.name === name)?.cardId;
    expect([card(0, "Claude"), card(0, "Streaming"), card(0, "Banco antigo"), card(2, "Claude")]).toEqual(["c1", "c1", null, "c1"]);
  });

  it("gives each month the bills that fall due in it, and the money already paid on them", async () => {
    mocks.statements = [
      statement({ id: "open" }), statement({ id: "future", status: "FUTURE_KNOWN", amountCents: 180_000, dueDate: day("2032-11-05"), closingDate: day("2032-10-25") }),
      statement({ id: "carried", amountCents: 620_000, dueDate: day("2032-10-05"), closingDate: day("2032-09-25"), rolledIntoStatementId: "future", payments: [{ amountCents: 200_000, date: day("2032-10-02") }] }),
    ];
    const data = await financeOverview("w1", "2032-10-12", OWNER);
    const bills = (index: number) => data.salaryPlan.months[index].bills.map((bill) => [bill.key, bill.toPayCents, bill.paidCents]);
    expect(bills(0)).toEqual([["c1", 420_000, 200_000]]); // October: the open bill, plus what was paid on the bill that moved on
    expect(bills(1)).toEqual([["c1", 180_000, 0]]);
    expect(bills(2)).toEqual([]);
    expect(data.salaryPlan.canSeeBills).toBe(true);
  });

  it("keeps card purchases out of the variable slice when a bill already holds them", async () => {
    mocks.statements = [statement({ id: "open" }), statement({ id: "future", status: "FUTURE_KNOWN", amountCents: 180_000, dueDate: day("2032-11-05"), closingDate: day("2032-10-25") })];
    mocks.expenses = [
      spent({ amountCents: 20_000, accountId: "bank" }),                                              // outside a card: variable
      spent({ amountCents: 30_000, accountId: "c1", date: day("2032-10-05") }),                       // before the closings the bills cover: inside a bill
      spent({ amountCents: 40_000, accountId: "c1", date: day("2032-10-26") }),                       // after the last closing: no bill holds it yet
      spent({ amountCents: 50_000, accountId: "c1", date: day("2032-10-27"), cardStatementId: "future" }), // detailed under a bill
    ];
    const data = await financeOverview("w1", "2032-10-12", OWNER);
    expect(data.salaryPlan.months[0].variableCents).toBe(20_000 + 40_000);
    expect(data.salaryPlan.months[0].variablesKnown).toBe(true);
    expect(data.salaryPlan.months.slice(1).every((month) => month.variableCents === 0 && !month.variablesKnown)).toBe(true);
  });

  it("a card without statements keeps its purchases in the variable slice, since no bill holds them", async () => {
    mocks.expenses = [spent({ amountCents: 20_000, accountId: "bank" }), spent({ amountCents: 30_000, accountId: "c1", date: day("2032-10-05") })];
    const data = await financeOverview("w1", "2032-10-12", OWNER);
    expect(data.salaryPlan.months[0].variableCents).toBe(50_000);
  });

  it("a posted fixed expense is not counted again as variable", async () => {
    mocks.planned = [planned({ id: "f1", name: "Academia", amountCents: 9_000 })];
    mocks.expenses = [spent({ amountCents: 9_000, description: "Academia" }), spent({ amountCents: 20_000 })];
    const data = await financeOverview("w1", "2032-10-12", OWNER);
    expect(data.salaryPlan.months[0].variableCents).toBe(20_000);
    expect(data.salaryPlan.months[0].items.map((entry) => [entry.name, entry.cents])).toEqual([["Academia", 9_000]]);
  });

  it("without owner access there are no bills in the plan, and the screen is told why", async () => {
    mocks.statements = [statement({ id: "open" })];
    const data = await financeOverview("w1", "2032-10-12");
    expect(data.salaryPlan.canSeeBills).toBe(false);
    expect(data.salaryPlan.months.every((month) => month.bills.length === 0)).toBe(true);
    expect(mocks.db.cardStatement.findMany).not.toHaveBeenCalled();
  });
});
