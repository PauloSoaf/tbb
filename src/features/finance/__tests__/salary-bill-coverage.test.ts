import { describe, expect, it } from "vitest";
import { fixedBillCoverage, allocateMonth } from "../salary-plan";
import { buildSalaryAllocation, type BillGroup } from "../salary-allocation";
import type { FixedItem } from "../fixed-expenses";

const bills: BillGroup[] = [{ key: "a", label: "Cartão sintético", toPayCents: 500_000, paidCents: 50_000, statements: [{ id: "nov", dueDate: "2032-11-03", toPayCents: 500_000, paidCents: 50_000 }] }];
const fixed = (name: string, cents: number, patch: Partial<FixedItem> = {}): FixedItem => ({ kind: "FIXED", id: name, name, cents, cardId: "a", ...patch });
const purchase = (patch = {}) => ({ id: "tx", accountId: "a", cardStatementId: "nov", amountCents: 7_000, description: "Academia", merchant: null, subscriptionId: null, ...patch });

describe("bill values and evidenced overlap", () => {
  it("card assignment alone never reduces a bill or pretends a planned expense is inside it", () => {
    const result = buildSalaryAllocation({ incomeCents: 600_000, items: [fixed("Transporte", 60_000)], variableCents: 0, bills });
    expect(result).toMatchObject({ billsCents: 550_000, fixedOutsideBillsCents: 60_000, fixedIncludedInBillsCents: 0, commitmentsCents: 610_000, deficitCents: 10_000 });
    expect(result.slices.find(slice => slice.kind === "BILL")?.cents).toBe(550_000);
  });
  it("takes only actual linked purchase cents out of the fixed slice, keeping an uncharged estimate additional", () => {
    const items = fixedBillCoverage([fixed("Academia", 10_000), fixed("Transporte", 60_000)], bills, [purchase()]);
    expect(items.map(item => item.includedInBillsCents)).toEqual([7_000, 0]);
    const result = buildSalaryAllocation({ incomeCents: 600_000, items, variableCents: 0, bills });
    expect(result).toMatchObject({ fixedCents: 70_000, fixedOutsideBillsCents: 63_000, fixedIncludedInBillsCents: 7_000, billsCents: 550_000, commitmentsCents: 613_000 });
    expect(result.slices.find(slice => slice.label === "Academia")?.cents).toBe(3_000);
    expect(result.slices.reduce((sum, slice) => sum + slice.cents, 0)).toBe(result.baseCents);
  });
  it("requires the same card and a statement represented in this month's chart", () => {
    const items = fixedBillCoverage([fixed("Academia", 10_000)], bills, [purchase({ id: "other-card", accountId: "b" }), purchase({ id: "other-month", cardStatementId: "dec" }), purchase({ id: "unlinked", cardStatementId: null })]);
    expect(items[0].includedInBillsCents).toBe(0);
  });
  it("matches a subscription by its saved identity even when issuer text differs", () => {
    const items = fixedBillCoverage([fixed("Streaming", 8_000, { id: "sub", kind: "SUBSCRIPTION" })], bills, [purchase({ description: "Issuer text", subscriptionId: "sub" })]);
    expect(items[0].includedInBillsCents).toBe(7_000);
  });
  it("never allocates the same purchase to two plans with the same name", () => {
    const items = fixedBillCoverage([fixed("Academia", 5_000, { id: "one" }), fixed("Academia", 5_000, { id: "two" })], bills, [purchase()]);
    expect(items.map(item => item.includedInBillsCents)).toEqual([5_000, 2_000]);
  });
  it("the fixed-only chart lists all fixed costs; hiding the bill restores their separate slices", () => {
    const items = fixedBillCoverage([fixed("Academia", 7_000)], bills, [purchase()]);
    const plan = { month: "2032-11", incomeCents: 600_000, items, bills, variableCents: 0, variablesKnown: false };
    const all = allocateMonth(plan), hidden = allocateMonth(plan, { hiddenBills: new Set(["a"]) });
    expect(all.complete.commitmentsCents).toBe(550_000);
    expect(all.fixedOnly.commitmentsCents).toBe(7_000);
    expect(hidden.complete.commitmentsCents).toBe(7_000);
  });
  it("preserves every Other item and keeps subscription and recurring kind totals after grouping", () => {
    const items = [fixed("Principal", 50_000), fixed("Segundo", 40_000), fixed("Streaming", 2_000, { kind: "SUBSCRIPTION" }), fixed("Serviço", 1_000, { kind: "RECURRING" }), fixed("Pequeno", 500)];
    const result = buildSalaryAllocation({ incomeCents: 200_000, items, variableCents: 0, maxItems: 3 });
    const other = result.slices.find(slice => slice.key === "other")!;
    expect(other.members?.map(item => [item.label, item.cents])).toEqual([["Streaming", 2_000], ["Serviço", 1_000], ["Pequeno", 500]]);
    expect(other.members?.reduce((sum, item) => sum + item.cents, 0)).toBe(other.cents);
    expect(result.byKind.find(slice => slice.kind === "SUBSCRIPTION")?.cents).toBe(2_000);
    expect(result.byKind.find(slice => slice.kind === "RECURRING")?.cents).toBe(1_000);
  });
});
