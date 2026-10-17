import { describe, expect, it } from "vitest";
import { spendingLimitUsage, limitWindow, type Limit, type LimitTransaction } from "../planning/spending-limits";
import { buildFinancialForecast, type ForecastFixed } from "../planning/forecast";
import { goalContributionPlan } from "../planning/goals";
import { fixedExecution, matchFixedCommitment } from "../planning/fixed-matching";

const limit: Limit = { id: "limit", scope: "GLOBAL", limitCents: 40000, startDate: "2032-10-15", endDate: "2032-10-25", baselineAt: "2032-10-15T12:00:00Z", baselineDate: "2032-10-15", excludeFixed: true, filterAccountIds: [], filterCategoryIds: [], statementId: null, recurring: false, status: "ACTIVE" };
const purchase = (patch: Partial<LimitTransaction> = {}): LimitTransaction => ({ id: "new", type: "EXPENSE", amountCents: 6000, accountId: "bank", categoryId: null, date: "2032-10-16", createdAt: "2032-10-16T12:00:00Z", isConsumption: true, ...patch });
describe("incremental spending limits use purchase evidence", () => {
  it("starts with existing identities as baseline, and counts only later purchases", () => {
    const result = spendingLimitUsage(limit, [purchase({ id: "old", amountCents: 12000 }), purchase()], [{ transactionId: "old", decision: "BASELINE" }], "2032-10-16");
    expect(result.usedNowCents).toBe(6000); expect(result.remainingCents).toBe(34000); expect(result.daysRemaining).toBe(10); expect(result.dailyAvailableCents).toBe(3400);
  });
  it("does not turn a late import of an older purchase into new spending", () => {
    const result = spendingLimitUsage(limit, [purchase({ date: "2032-10-17", purchasedDate: "2032-10-14", createdAt: "2032-10-18T00:00:00Z", source: "DOCUMENT_V2" })], [], "2032-10-18");
    expect(result.usedNowCents).toBe(0); expect(result.pending).toEqual([]);
  });
  it("asks for classification when same-day time or an imported purchase date is unknown", () => {
    const rows = [purchase({ id: "same", date: "2032-10-15" }), purchase({ id: "posting", source: "DOCUMENT_V2", dateBasis: "POSTED_DATE" })];
    expect(spendingLimitUsage(limit, rows, [], "2032-10-17").pending.map(row => row.reason)).toEqual(["TIME_UNKNOWN", "PURCHASE_DATE_UNKNOWN"]);
    expect(spendingLimitUsage(limit, rows, rows.map(row => ({ transactionId: row.id, decision: "COUNT" })), "2032-10-17").usedNowCents).toBe(12000);
  });
  it("uses an actual timestamp only to compare purchases on the baseline day", () => {
    expect(spendingLimitUsage(limit, [purchase({ date: "2032-10-15", occurredAt: "2032-10-15T11:00:00Z" }), purchase({ id: "later", date: "2032-10-15", occurredAt: "2032-10-15T13:00:00Z" })], [], "2032-10-15").usedNowCents).toBe(6000);
  });
  it("includes the final day and excludes later purchases and non-consumption payments", () => {
    expect(spendingLimitUsage(limit, [purchase({ date: "2032-10-25" }), purchase({ id: "late", date: "2032-10-26" }), purchase({ id: "transfer", type: "TRANSFER" }), purchase({ id: "settle", eventKind: "CARD_SETTLEMENT" })], [], "2032-10-25").usedNowCents).toBe(6000);
  });
  it("counts card consumption by purchase day and respects card and fixed exclusions", () => {
    const cardLimit = { ...limit, scope: "ACCOUNT", filterAccountIds: ["card"] };
    expect(spendingLimitUsage(cardLimit, [purchase({ accountId: "card", date: "2032-12-03", purchasedDate: "2032-10-16" }), purchase({ id: "fixed", accountId: "card", fixedExpenseId: "fixed" }), purchase()], [], "2032-10-20").usedNowCents).toBe(6000);
  });
  it("recalculates edits and refunds after an explicit refund-origin decision", () => {
    const rows = [purchase({ amountCents: 24000 }), purchase({ id: "refund", type: "REFUND", amountCents: 5000 })];
    expect(spendingLimitUsage(limit, rows, [], "2032-10-18").pendingReviewCount).toBe(1);
    expect(spendingLimitUsage(limit, rows, [{ transactionId: "refund", decision: "COUNT" }], "2032-10-18").usedNowCents).toBe(19000);
    expect(spendingLimitUsage(limit, [purchase({ amountCents: 12000 })], [], "2032-10-18").remainingCents).toBe(28000);
  });
  it("keeps cumulative history consistent when a confirmed refund precedes another purchase", () => {
    const result = spendingLimitUsage(limit, [purchase({ id: "refund", date: "2032-10-16", type: "REFUND", amountCents: 3000 }), purchase({ date: "2032-10-17", amountCents: 10000 })], [{ transactionId: "refund", decision: "COUNT" }], "2032-10-18");
    expect(result.history.at(-1)?.usedCents).toBe(result.usedNowCents); expect(result.usedNowCents).toBe(7000);
  });
  it.each([[0, "NORMAL"], [20000, "ATTENTION"], [32000, "ALERT"], [40000, "REACHED"], [40001, "EXCEEDED"]])("reports %s cents as %s", (amount, risk) => {
    expect(spendingLimitUsage(limit, [purchase({ amountCents: Number(amount) })], [], "2032-10-17").risk).toBe(risk);
  });
  it("clamps recurring cycles across short months without applying initial baselines again", () => {
    const monthly = { ...limit, startDate: "2032-01-27", endDate: "2032-02-26", recurring: true };
    expect(limitWindow(monthly, "2032-02")).toEqual({ start: "2032-02-27", end: "2032-03-26", initial: false });
    expect(spendingLimitUsage(monthly, [purchase({ date: "2032-02-28" })], [{ transactionId: "new", decision: "BASELINE" }], "2032-02-28", "2032-02").usedNowCents).toBe(6000);
  });
  it("reports scheduled purchases separately from spending that has occurred", () => {
    const result = spendingLimitUsage(limit, [purchase(), purchase({ id: "future", date: "2032-10-22" })], [], "2032-10-18");
    expect(result.usedNowCents).toBe(6000); expect(result.scheduledCents).toBe(6000); expect(result.remainingCents).toBe(28000);
  });
});

const bank = { id: "bank", name: "Synthetic bank", type: "CHECKING", closingDay: null, dueDay: null };
const card = { id: "card", name: "Synthetic card", type: "CREDIT_CARD", closingDay: 26, dueDay: 3 };
const fixed: ForecastFixed = { id: "fixed", name: "Synthetic fixed", amountCents: 65000, startsOn: null, endsOn: null, dueDay: 10, cardAccountId: null };
const bill = { id: "bill", accountId: "card", accountName: "Synthetic card", kind: "STATEMENT" as const, status: "OPEN" as const, amountCents: 450000, dueDate: "2032-11-03", paidAt: null, rolledIntoStatementId: null };
const base = () => ({ today: "2032-10-15", startsOn: "2032-10-01", count: 3, incomeDefaultCents: 550000, accounts: [bank, card], fixed: [] as ForecastFixed[], subscriptions: [], transactions: [], statements: [], overrides: [], goals: [], limits: [] });
describe("forecasts keep consumption, cash and reserves distinct", () => {
  it("keeps received income separate from the expected total instead of counting salary twice", () => {
    const rows = buildFinancialForecast({ ...base(), transactions: [{ ...purchase({ type: "INCOME", amountCents: 550000, date: "2032-10-10" }), description: "Confirmed receipt" }] });
    expect(rows[0].incomeCents).toBe(550000); expect(rows[0].receivedCents).toBe(550000); expect(rows[0].surplusCents).toBe(550000);
  });
  it("simulates an explicitly annual goal without changing its real reserve", () => {
    const goal = { id: "annual", name: "Annual obligation", targetAmountCents: 120000, currentAmountCents: 120000, targetDate: "2032-12-20", monthlyContributionCents: null, status: "ACTIVE", recurrence: "YEARLY" };
    const rows = buildFinancialForecast({ ...base(), count: 15, goals: [goal] });
    expect(rows.find(row => row.month === "2033-01")!.reservesCents).toBe(10000); expect(rows.find(row => row.month === "2033-12")!.otherOutflowCents).toBe(120000); expect(rows.find(row => row.month === "2033-12")!.issues).toContain("GOAL_RECURRENCE_ESTIMATE"); expect(goal.currentAmountCents).toBe(120000);
  });
  it("does not project a temporary fixed expense before its start or after its end month", () => {
    const rows = buildFinancialForecast({ ...base(), startsOn: "2032-10-01", count: 4, fixed: [{ ...fixed, amountCents: 55000, startsOn: "2032-11-01", endsOn: "2032-12-02" }] });
    expect(rows.map(row => row.fixedOutsideBillsCents)).toEqual([0, 55000, 55000, 0]);
  });
  it("preserves full bills and subtracts only proven fixed coverage from the separate fixed slice", () => {
    const rows = buildFinancialForecast({ ...base(), fixed: [{ ...fixed, cardAccountId: "card" }], statements: [bill], transactions: [{ ...purchase({ amountCents: 20000, fixedExpenseId: "fixed", accountId: "card", cardStatementId: "bill" }), description: "Actual fixed" }] });
    expect(rows[1].billsCents).toBe(450000); expect(rows[1].fixedOutsideBillsCents).toBe(45000); expect(rows[0].fixedIncludedInBillsCents).toBe(20000); expect(rows[1].variableCashCents).toBe(0);
  });
  it("does not treat a planned card link as proof that a fixed charge is inside the bill", () => {
    const rows = buildFinancialForecast({ ...base(), fixed: [{ ...fixed, cardAccountId: "card" }], statements: [bill] });
    expect(rows[1].fixedOutsideBillsCents).toBe(65000); expect(rows[1].billsCents).toBe(450000);
  });
  it("counts card consumption in October and its cash once in November", () => {
    const rows = buildFinancialForecast({ ...base(), statements: [bill], transactions: [{ ...purchase({ accountId: "card", amountCents: 10000, cardStatementId: "bill" }), description: "Card purchase" }] });
    expect(rows[0].variableActualCents).toBe(10000); expect(rows.map(row => row.variableCashCents)).toEqual([0, 0, 0]); expect(rows[1].billsCents).toBe(450000);
  });
  it("projects unlinked credit purchases by the configured cycle and marks their uncertainty", () => {
    const rows = buildFinancialForecast({ ...base(), transactions: [{ ...purchase({ accountId: "card", amountCents: 10000 }), description: "Card purchase" }] });
    expect(rows[0].variableActualCents).toBe(10000); expect(rows[1].variableCashCents).toBe(10000); expect(rows[1].issues).toContain("UNLINKED_CARD_PURCHASE");
  });
  it("treats missing income as incomplete and an explicit zero override as known zero", () => {
    const unknown = buildFinancialForecast({ ...base(), incomeDefaultCents: null }); expect(unknown[0].surplusCents).toBeNull(); expect(unknown[0].issues).toContain("INCOME_UNKNOWN");
    const zero = buildFinancialForecast({ ...base(), overrides: [{ month: "2032-10", incomeOverrideCents: 0, extraIncomeCents: 0, extraIncomeStatus: "EXPECTED", variableBudgetCents: 0, variableCardAccountId: null, otherOutflowCents: 0, otherOutflowDescription: null }] });
    expect(zero[0].surplusCents).toBe(0);
  });
  it("counts earmarked goal contributions once and releases funded reserves at payment time", () => {
    const rows = buildFinancialForecast({ ...base(), goals: [{ id: "goal", name: "Synthetic tax", targetAmountCents: 120000, currentAmountCents: 60000, targetDate: "2032-12-20", monthlyContributionCents: 20000, status: "ACTIVE" }] });
    expect(rows.map(row => row.reservesCents)).toEqual([20000, 20000, 20000]); expect(rows[2].otherOutflowCents).toBe(120000); expect(rows[2].fundedGoalUseCents).toBe(120000); expect(rows[2].surplusCents).toBe(530000);
  });
  it("projects overdue unpaid goals now rather than losing the obligation", () => {
    const rows = buildFinancialForecast({ ...base(), goals: [{ id: "goal", name: "Synthetic overdue", targetAmountCents: 10000, currentAmountCents: 0, targetDate: "2032-09-01", monthlyContributionCents: 0, status: "ACTIVE" }] });
    expect(rows[0].otherOutflowCents).toBe(10000); expect(rows[0].issues).toContain("GOAL_OVERDUE");
  });
  it("uses the remaining variable budget and never sums an overlapping global cap twice", () => {
    const rows = buildFinancialForecast({ ...base(), limits: [{ limit: { ...limit, baselineAt: null, baselineDate: null, startDate: "2032-10-01" }, remainingCents: 30000 }, { limit: { ...limit, id: "account", scope: "ACCOUNT", filterAccountIds: ["bank"], startDate: "2032-10-01", baselineAt: null, baselineDate: null }, remainingCents: 20000 }] });
    expect(rows[0].variablePlannedCents).toBe(30000);
  });
  it("includes confirmed cash refunds rather than losing them through a zero clamp", () => {
    const rows = buildFinancialForecast({ ...base(), transactions: [{ ...purchase({ type: "REFUND", amountCents: 10000 }), description: "Refund" }] });
    expect(rows[0].cashSurplusCents).toBe(560000);
  });
});
describe("fixed matching and goal calculations", () => {
  it("recognizes Wellhub/Gympass as a suggestion, never as a confirmed duplicate by name alone", () => {
    const match = matchFixedCommitment({ id: "fixed", name: "Gympass", amountCents: 20000 }, { id: "purchase", description: "Wellhub", amountCents: 20000 });
    expect(match?.confidence).toBe("REVIEW");
    expect(matchFixedCommitment({ id: "fixed", name: "Gympass", amountCents: 20000, cardAccountId: "card" }, { id: "purchase", description: "Wellhub", amountCents: 20000, accountId: "other" })).toBeNull();
  });
  it("shows unused fuel forecast after linked actual spending, net of refunds", () => {
    const result = fixedExecution({ id: "fuel", name: "Fuel", amountCents: 65000 }, [{ id: "p", fixedExpenseId: "fuel", description: "Fuel", amountCents: 30000, date: "2032-10-10" }, { id: "refund", fixedExpenseId: "fuel", type: "REFUND", description: "Refund", amountCents: 5000, date: "2032-10-11" }], "2032-10", "2032-10-15");
    expect(result.actualCents).toBe(25000); expect(result.remainingCents).toBe(40000);
  });
  it("uses amounts already paid when suggesting the next goal contribution", () => {
    expect(goalContributionPlan({ id: "goal", name: "Synthetic", targetAmountCents: 120000, currentAmountCents: 20000, paidAmountCents: 40000, targetDate: "2032-12-01", monthlyContributionCents: null, status: "ACTIVE" }, "2032-10-01")).toMatchObject({ remainingCents: 60000, suggestedCents: 20000, progressBasisPoints: 5000 });
  });
});
