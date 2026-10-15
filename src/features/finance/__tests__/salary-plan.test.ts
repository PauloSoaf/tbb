import { describe, expect, it } from "vitest";
import { fixedExpenseItems, plannedActiveIn, type FixedItem } from "../fixed-expenses";
import { buildSalaryAllocation } from "../salary-allocation";
import { allocateMonth, billsForMonth, billsOverflow, monthKeys, variableOutsideStatements, type MonthPlan, type StatementLite } from "../salary-plan";
import { statementCoverage } from "../credit-limit";
import type { StatementRow } from "../card-statements";

// Synthetic figures only.
const TODAY = "2032-10-12";
const bill = (patch: Partial<StatementLite> = {}): StatementLite => ({
  id: "s1", accountId: "c1", accountName: "Cartão A", kind: "STATEMENT", status: "OPEN", amountCents: 100_000, dueDate: "2032-10-20", paidAt: null, rolledIntoStatementId: null, payments: [], ...patch,
});
const item = (name: string, cents: number, patch: Partial<FixedItem> = {}): FixedItem => ({ kind: "FIXED", id: name, name, cents, ...patch });
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

describe("the months of the plan", () => {
  it("starts at the current month and runs six, across the year end", () => {
    expect(monthKeys("2032-10-12")).toEqual(["2032-10", "2032-11", "2032-12", "2033-01", "2033-02", "2033-03"]);
    expect(monthKeys("2032-01-31", 2)).toEqual(["2032-01", "2032-02"]);
  });
  it("a planned expense counts up to and including the month of its end date, and never ends without one", () => {
    const planned = [{ name: "Sempre" }, { name: "Até dezembro", endsOn: "2032-12-02" }, { name: "Encerrado", endsOn: "2032-09-30" }, { name: "Vazio", endsOn: null }];
    const names = (month: string) => plannedActiveIn(planned, month).map((entry) => entry.name);
    expect(names("2032-10")).toEqual(["Sempre", "Até dezembro", "Vazio"]);
    expect(names("2032-12")).toEqual(["Sempre", "Até dezembro", "Vazio"]);
    expect(names("2033-01")).toEqual(["Sempre", "Vazio"]);
    expect(names("2032-09")).toEqual(["Sempre", "Até dezembro", "Encerrado", "Vazio"]);
  });
});

describe("which card a fixed commitment is charged to", () => {
  const cards = new Set(["c1", "c2"]);
  const sub = { id: "sub", name: "Assistente", merchant: null, amountCents: 5_000, billingCycle: "MONTHLY", customDays: null };
  it("uses the link the user set on a planned expense, the account of a subscription and the account of a posting", () => {
    const items = fixedExpenseItems(
      [{ description: "Academia", merchant: null, amountCents: 9_000, accountId: "c2" }, { description: "Pix do aluguel", merchant: null, amountCents: 100_000, accountId: "bank" }],
      [{ ...sub, accountId: "c1" }], [{ id: "p1", name: "Claude", amountCents: 12_000, cardId: "c1" }, { id: "p2", name: "Luz", amountCents: 20_000 }], { cardIds: cards },
    );
    const card = (name: string) => items.find((entry) => entry.name === name)?.cardId;
    expect([card("Claude"), card("Luz"), card("Assistente"), card("Academia"), card("Pix do aluguel")]).toEqual(["c1", null, "c1", "c2", null]);
  });
  it("ignores a link to a card that is not active, and never guesses without knowing the cards", () => {
    expect(fixedExpenseItems([], [], [{ name: "Claude", amountCents: 100, cardId: "gone" }], { cardIds: cards })[0].cardId).toBeNull();
    const blind = fixedExpenseItems([{ description: "Academia", merchant: null, amountCents: 900, accountId: "c2" }], [{ ...sub, accountId: "c1" }], [{ name: "Claude", amountCents: 100, cardId: "c1" }]);
    expect(blind.map((entry) => entry.cardId)).toEqual(["c1", null, null]); // only the explicit link is trusted
  });
  it("what is posted above the plan stays on the same card as the plan", () => {
    const items = fixedExpenseItems([{ description: "Claude", merchant: null, amountCents: 15_000, accountId: "c1" }], [], [{ name: "Claude", amountCents: 12_000, cardId: "c1" }], { cardIds: cards });
    expect(items.map((entry) => [entry.name, entry.cents, entry.cardId])).toEqual([["Claude", 12_000, "c1"], ["Claude (acima do previsto)", 3_000, "c1"]]);
  });
});

describe("what each card's bills ask of a month", () => {
  const groups = (rows: StatementLite[], month: string) => billsForMonth(rows, month, TODAY).map((group) => [group.key, group.toPayCents, group.paidCents]);

  it("an open or known future bill belongs to the month it falls due", () => {
    const rows = [bill(), bill({ id: "s2", status: "FUTURE_KNOWN", amountCents: 180_000, dueDate: "2032-11-05" })];
    expect(groups(rows, "2032-10")).toEqual([["c1", 100_000, 0]]);
    expect(groups(rows, "2032-11")).toEqual([["c1", 180_000, 0]]);
    expect(groups(rows, "2032-12")).toEqual([]);
  });
  it("an open bill already overdue is owed now, so it is in the current month only", () => {
    const rows = [bill({ dueDate: "2032-09-30" })];
    expect(groups(rows, "2032-10")).toEqual([["c1", 100_000, 0]]);
    expect(groups(rows, "2032-11")).toEqual([]);
    expect(groups(rows, "2032-09")).toEqual([]);
  });
  it("a known future bill whose date passed without an update is not counted as owed", () => {
    expect(groups([bill({ status: "FUTURE_KNOWN", dueDate: "2032-09-30" })], "2032-10")).toEqual([]);
  });
  it("a bill whose balance moved into the next one owes nothing, but what was paid on it still left the month", () => {
    const carried = bill({ id: "old", amountCents: 620_000, dueDate: "2032-10-05", rolledIntoStatementId: "next", payments: [{ amountCents: 200_000, date: "2032-10-02" }] });
    const next = bill({ id: "next", status: "FUTURE_KNOWN", amountCents: 570_000, dueDate: "2032-11-03" });
    expect(groups([carried, next], "2032-10")).toEqual([["c1", 0, 200_000]]);
    expect(groups([carried, next], "2032-11")).toEqual([["c1", 570_000, 0]]); // the balance is counted once, in November
    expect(groups([{ ...carried, status: "PAID", paidAt: "2032-10-02" }, next], "2032-10")).toEqual([["c1", 0, 200_000]]);
  });
  it("payments are placed by their own date; an undated one by the month its bill is due", () => {
    const partial = bill({ amountCents: 300_000, payments: [{ amountCents: 50_000, date: "2032-09-28" }, { amountCents: 70_000, date: "2032-10-03" }, { amountCents: 10_000, date: null }] });
    expect(groups([partial], "2032-10")).toEqual([["c1", 300_000, 80_000]]);
    expect(groups([partial], "2032-09")).toEqual([["c1", 0, 50_000]]); // that payment left in September, though the bill is October's
  });
  it("a bill marked paid without payment lines counts, in full, in the month it was paid", () => {
    const paid = bill({ status: "PAID", paidAt: "2032-10-04", amountCents: 300_000, dueDate: "2032-10-05" });
    expect(groups([paid], "2032-10")).toEqual([["c1", 0, 300_000]]);
    expect(groups([paid], "2032-11")).toEqual([]);
    expect(groups([{ ...paid, payments: [{ amountCents: 120_000, date: "2032-10-04" }] }], "2032-10")).toEqual([["c1", 0, 120_000]]); // payment lines win
  });
  it("forecasts and monthly projections are estimates, not bills", () => {
    expect(groups([bill({ kind: "MONTHLY_PROJECTION", status: "FORECAST" })], "2032-10")).toEqual([]);
    expect(groups([bill({ kind: "MONTHLY_PROJECTION", status: "OPEN" })], "2032-10")).toEqual([]); // the kind is checked on its own, not only the status
  });
  it("groups a card's bills in one line, and orders the cards by what they ask", () => {
    const rows = [bill({ id: "a", amountCents: 100_000 }), bill({ id: "b", amountCents: 50_000, dueDate: "2032-10-28" }), bill({ id: "c", accountId: "c2", accountName: "Cartão B", amountCents: 400_000 })];
    const result = billsForMonth(rows, "2032-10", TODAY);
    expect(result.map((group) => [group.label, group.toPayCents])).toEqual([["Fatura Cartão B", 400_000], ["Fatura Cartão A", 150_000]]);
    expect(result[1].statements.map((line) => line.id)).toEqual(["a", "b"]);
  });
});

describe("a fixed expense charged to a card is not counted twice", () => {
  const items = [item("Claude", 12_000, { cardId: "c1", includedInBillsCents: 12_000 }), item("GPT", 10_000, { cardId: "c1", includedInBillsCents: 10_000 }), item("Aluguel", 150_000)];
  const bills = [{ key: "c1", label: "Fatura Cartão A", toPayCents: 100_000, paidCents: 0, statements: [] }];

  it("keeps the full bill and removes evidenced purchases from the separate fixed slices", () => {
    const result = buildSalaryAllocation({ incomeCents: 500_000, items, variableCents: 0, bills });
    expect(result.bills[0]).toMatchObject({ grossCents: 100_000, linkedCents: 22_000, netCents: 78_000 });
    expect(result.slices.filter((slice) => slice.kind === "BILL").map((slice) => slice.cents)).toEqual([100_000]);
    // the card's money is the bill once: linked slices + the rest of the bill
    expect(sum(result.slices.filter((slice) => slice.cardId === "c1" || slice.id === "c1").map((slice) => slice.cents))).toBe(100_000);
    expect(result).toMatchObject({ fixedCents: 172_000, fixedOutsideBillsCents: 150_000, fixedIncludedInBillsCents: 22_000, billsCents: 100_000, billsGrossCents: 100_000, commitmentsCents: 250_000, freeCents: 250_000, deficitCents: 0 });
    expect(sum(result.slices.map((slice) => slice.cents))).toBe(500_000);
    expect(sum(result.slices.map((slice) => slice.basisPoints))).toBe(10_000);
  });
  it("caps coverage at the bill total while keeping the full bill visible", () => {
    const small = [{ ...bills[0], toPayCents: 15_000 }];
    const result = buildSalaryAllocation({ incomeCents: 500_000, items, variableCents: 0, bills: small });
    expect(result.bills[0]).toMatchObject({ grossCents: 15_000, linkedCents: 15_000, netCents: 0 });
    expect(result.slices.some((slice) => slice.kind === "BILL")).toBe(true);
    expect(result.commitmentsCents).toBe(172_000);
  });
  it("a bill with nothing linked to it counts as it is, and paid money counts with what is still owed", () => {
    const result = buildSalaryAllocation({ incomeCents: 500_000, items: [item("Aluguel", 150_000)], variableCents: 20_000, bills: [{ key: "c2", label: "Fatura Cartão B", toPayCents: 30_000, paidCents: 20_000, statements: [] }] });
    expect(result.bills[0]).toMatchObject({ grossCents: 50_000, netCents: 50_000, toPayCents: 30_000, paidCents: 20_000 });
    expect(result.commitmentsCents).toBe(220_000);
  });
  it("an overdraft is a number of its own, never a negative slice, with the bills in it", () => {
    const result = buildSalaryAllocation({ incomeCents: 300_000, items, variableCents: 0, bills });
    expect(result).toMatchObject({ commitmentsCents: 250_000, deficitCents: 0 });
    const heavy = buildSalaryAllocation({ incomeCents: 200_000, items, variableCents: 0, bills });
    expect(heavy).toMatchObject({ commitmentsCents: 250_000, deficitCents: 50_000, freeCents: 0, baseCents: 250_000 });
    expect(heavy.slices.every((slice) => slice.cents > 0)).toBe(true);
    expect(sum(heavy.slices.map((slice) => slice.basisPoints))).toBe(10_000);
  });
  it("groups the bills in their own kind and never folds a bill into \"Outros\"", () => {
    const many = Array.from({ length: 12 }, (_, index) => item(`Item ${index}`, 1_000 + index));
    const result = buildSalaryAllocation({ incomeCents: 900_000, items: many, variableCents: 0, bills, maxItems: 4 });
    expect(result.slices.find((slice) => slice.key === "other")?.merged).toBe(9);
    expect(result.slices.some((slice) => slice.kind === "BILL")).toBe(true);
    expect(result.byKind.map((group) => group.kind)).toEqual(["FIXED", "BILL", "FREE"]);
  });
  it("without bills the allocation is exactly what it was before", () => {
    const before = buildSalaryAllocation({ incomeCents: 500_000, items, variableCents: 30_000 });
    expect(before).toMatchObject({ billsCents: 0, billsGrossCents: 0, bills: [], commitmentsCents: 202_000, freeCents: 298_000 });
  });
});

describe("the two charts of a month", () => {
  const plan: MonthPlan = {
    month: "2032-11", incomeCents: 550_000, variablesKnown: false, variableCents: 0,
    items: [item("Aluguel", 150_000), item("Claude", 12_000, { cardId: "c1" })],
    bills: [{ key: "c1", label: "Fatura Cartão A", toPayCents: 570_000, paidCents: 0, statements: [] }, { key: "c2", label: "Fatura Cartão B", toPayCents: 80_000, paidCents: 0, statements: [] }],
  };
  it("the complete chart has the bills; the fixed-only chart has none and never a variable slice", () => {
    const { complete, fixedOnly } = allocateMonth({ ...plan, variableCents: 40_000 });
    expect(complete.slices.some((slice) => slice.kind === "BILL")).toBe(true);
    expect(complete.slices.some((slice) => slice.kind === "VARIABLE")).toBe(true);
    expect(fixedOnly.slices.map((slice) => slice.kind).sort()).toEqual(["FIXED", "FIXED", "FREE"]);
    expect(fixedOnly).toMatchObject({ fixedCents: 162_000, billsCents: 0, variableCents: 0, commitmentsCents: 162_000, freeCents: 388_000 });
  });
  it("taking a bill out of the chart removes it from the totals, but its linked fixed expenses stay", () => {
    const all = allocateMonth(plan);
    const without = allocateMonth(plan, { hiddenBills: new Set(["c1"]) });
    expect(all.complete.billsGrossCents).toBe(650_000);
    expect(without.complete.billsGrossCents).toBe(80_000);
    expect(without.hiddenBills.map((group) => group.key)).toEqual(["c1"]);
    expect(without.complete.slices.some((slice) => slice.cardId === "c1")).toBe(true);
    expect(without.complete.fixedCents).toBe(all.complete.fixedCents);
    expect(without.complete.commitmentsCents).toBe(162_000 + 80_000);
  });
  it("warns when the fixed expenses and the bills together pass the income, and not before", () => {
    const heavy = allocateMonth(plan).complete;
    expect(heavy.fixedCents + heavy.billsCents).toBeGreaterThan(550_000);
    expect(billsOverflow(heavy)).toBe(true);
    expect(billsOverflow(allocateMonth(plan, { hiddenBills: new Set(["c1"]) }).complete)).toBe(false);
    expect(billsOverflow(allocateMonth({ ...plan, bills: [] }).complete)).toBe(false);
    expect(billsOverflow(allocateMonth({ ...plan, incomeCents: 0 }).complete)).toBe(false); // without an income there is nothing to compare with
  });
  it("counts the fixed expenses too: bills smaller than the income can still overflow it once the fixed ones are paid", () => {
    const fits = (fixed: number, billCents: number) => billsOverflow(allocateMonth({ month: "2032-11", incomeCents: 550_000, variableCents: 0, variablesKnown: false, items: [item("Aluguel", fixed)], bills: [{ key: "c1", label: "Fatura", toPayCents: billCents, paidCents: 0, statements: [] }] }).complete);
    expect(fits(300_000, 300_000)).toBe(true);   // 300k of bills alone is under the 550k income, with the fixed ones it is not
    expect(fits(100_000, 300_000)).toBe(false);
    expect(fits(250_000, 300_000)).toBe(false);  // exactly the income is not above it
  });
});

describe("variable spending that is already inside a bill", () => {
  const cards = new Map([["c1", { hasStatements: true, coverage: "2032-10-10" }], ["c2", { hasStatements: false, coverage: null }]]);
  const row = (accountId: string, date: string, amountCents: number, patch: { cardStatementId?: string | null; isFixed?: boolean } = {}) => ({ accountId, date, amountCents, cardStatementId: null, isFixed: false, ...patch });

  it("leaves out purchases that a registered bill holds: linked to it, or older than what it covers", () => {
    const value = variableOutsideStatements({ cards, expenses: [
      row("bank", "2032-10-03", 10_000),                               // paid outside a card: variable
      row("c1", "2032-10-05", 20_000),                                 // before the last closing: inside a bill
      row("c1", "2032-10-11", 3_000),                                  // after it: no bill holds it yet
      row("c1", "2032-10-11", 4_000, { cardStatementId: "s1" }),       // detailed under a bill
      row("c2", "2032-10-05", 5_000),                                  // a card without statements: nothing holds it
    ] });
    expect(value).toBe(10_000 + 3_000 + 5_000);
  });
  it("takes out the posted fixed expenses that are left, since they already have their slice", () => {
    expect(variableOutsideStatements({ cards, expenses: [row("bank", "2032-10-03", 10_000), row("bank", "2032-10-04", 4_000, { isFixed: true }), row("c1", "2032-10-05", 9_000, { isFixed: true })] })).toBe(10_000);
    expect(variableOutsideStatements({ cards, expenses: [row("bank", "2032-10-04", 4_000, { isFixed: true })] })).toBe(0);
    expect(variableOutsideStatements({ cards, expenses: [] })).toBe(0);
  });
  it("a card with bills but no closing date uses the last due date, like the credit limit does", () => {
    const rows = [{ id: "a", kind: "STATEMENT", dueDate: "2032-10-20", closingDate: null, closingDay: null, status: "OPEN" }] as unknown as StatementRow[];
    expect(statementCoverage(rows)).toBeTruthy();
    expect(statementCoverage([])).toBeNull();
  });
});
