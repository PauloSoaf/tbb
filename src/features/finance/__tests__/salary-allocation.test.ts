import { describe, expect, it } from "vitest";
import { calculateFixedExpenses, fixedExpenseItems, type FixedItem } from "../fixed-expenses";
import { buildSalaryAllocation, shares } from "../salary-allocation";

const fixed = (name: string, cents: number, id: string | null = name): FixedItem => ({ kind: "FIXED", id, name, cents, plannedCents: cents });
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

describe("F05 · salary allocation arithmetic", () => {
  it("income 5.500 with three fixed destinations: three slices, 3.200 left, nothing lost", () => {
    const result = buildSalaryAllocation({ incomeCents: 550_000, items: [fixed("Aluguel de sala", 120_000), fixed("Academia", 70_000), fixed("Diarista", 40_000)], variableCents: 0 });
    expect(result.slices.filter((slice) => slice.kind === "FIXED").map((slice) => [slice.label, slice.cents])).toEqual([["Aluguel de sala", 120_000], ["Academia", 70_000], ["Diarista", 40_000]]);
    expect(result).toMatchObject({ freeCents: 320_000, deficitCents: 0, commitmentsCents: 230_000, usageBasisPoints: 4182, baseCents: 550_000 });
    expect(sum(result.slices.map((slice) => slice.cents))).toBe(550_000);
    expect(sum(result.slices.map((slice) => slice.basisPoints))).toBe(10_000);
  });

  it("closes to the cent for any mix, with variable spending, whenever the income covers everything", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const items = Array.from({ length: seed % 12 }, (_, index) => fixed(`Item ${index}`, ((seed * 7919 + index * 104729) % 90_000) + 1, `id${index}`));
      const variable = (seed * 31337) % 50_000;
      const commitments = sum(items.map((item) => item.cents)) + variable;
      const income = commitments + ((seed * 4093) % 300_000);
      const result = buildSalaryAllocation({ incomeCents: income, items, variableCents: variable, maxItems: 5 });
      expect(sum(result.slices.map((slice) => slice.cents))).toBe(income);
      expect(sum(result.slices.map((slice) => slice.basisPoints))).toBe(10_000);
      expect(result.slices.every((slice) => slice.cents > 0 && slice.basisPoints >= 0)).toBe(true);
    }
  });

  it("a shortfall is a number of its own, never a negative slice", () => {
    const result = buildSalaryAllocation({ incomeCents: 200_000, items: [fixed("Aluguel", 150_000), fixed("Escola", 90_000)], variableCents: 20_000 });
    expect(result).toMatchObject({ deficitCents: 60_000, freeCents: 0, commitmentsCents: 260_000, baseCents: 260_000, usageBasisPoints: 13_000 });
    expect(result.slices.map((slice) => slice.kind)).not.toContain("FREE");
    expect(result.slices.every((slice) => slice.cents > 0)).toBe(true);
    expect(sum(result.slices.map((slice) => slice.cents))).toBe(260_000);
    expect(sum(result.slices.map((slice) => slice.basisPoints))).toBe(10_000);
  });

  it("zero income: no percentage of income, and no slices when there is nothing planned either", () => {
    expect(buildSalaryAllocation({ incomeCents: 0, items: [], variableCents: 0 })).toMatchObject({ slices: [], usageBasisPoints: null, baseCents: 0, freeCents: 0, deficitCents: 0 });
    const planned = buildSalaryAllocation({ incomeCents: 0, items: [fixed("Aluguel", 100_000)], variableCents: 0 });
    expect(planned).toMatchObject({ usageBasisPoints: null, deficitCents: 100_000, baseCents: 100_000 });
    expect(planned.slices).toHaveLength(1);
  });

  it("a zero plan shows only the free income, as one full slice", () => {
    const result = buildSalaryAllocation({ incomeCents: 550_000, items: [fixed("Nada", 0)], variableCents: 0 });
    expect(result.slices).toEqual([expect.objectContaining({ kind: "FREE", cents: 550_000, basisPoints: 10_000 })]);
  });

  it("two commitments with the same name are both kept, and the total is their sum", () => {
    const result = buildSalaryAllocation({ incomeCents: 500_000, items: [fixed("Gasolina", 30_000, "a"), fixed("Gasolina", 20_000, "b")], variableCents: 0 });
    expect(result.slices.filter((slice) => slice.label === "Gasolina").map((slice) => slice.cents).sort()).toEqual([20_000, 30_000]);
    expect(new Set(result.slices.map((slice) => slice.key)).size).toBe(result.slices.length);
    expect(result.fixedCents).toBe(50_000);
  });

  it("folds the long tail into one 'Outros' slice and keeps the totals", () => {
    const items = Array.from({ length: 15 }, (_, index) => fixed(`Gasto ${index + 1}`, (index + 1) * 1_000, `id${index}`));
    const result = buildSalaryAllocation({ incomeCents: 400_000, items, variableCents: 0, maxItems: 6 });
    const commitments = result.slices.filter((slice) => slice.kind !== "FREE");
    expect(commitments).toHaveLength(6);
    expect(commitments.at(-1)).toMatchObject({ key: "other", merged: 10, label: "Outros (10)" });
    expect(sum(result.slices.map((slice) => slice.cents))).toBe(400_000);
  });

  it("groups by type with their own exact percentages", () => {
    const result = buildSalaryAllocation({ incomeCents: 1_000_000, items: [fixed("Aluguel", 300_000), { kind: "SUBSCRIPTION", id: "s", name: "Streaming", cents: 5_000 }, { kind: "RECURRING", id: null, name: "Condomínio", cents: 45_000 }], variableCents: 100_000 });
    expect(result.byKind.map((group) => [group.kind, group.cents])).toEqual([["FIXED", 300_000], ["SUBSCRIPTION", 5_000], ["RECURRING", 45_000], ["VARIABLE", 100_000], ["FREE", 550_000]]);
    expect(sum(result.byKind.map((group) => group.basisPoints))).toBe(10_000);
  });

  it("ignores negative, fractional and non-finite inputs instead of drawing nonsense", () => {
    const result = buildSalaryAllocation({ incomeCents: 100_000.4, items: [fixed("Ruim", -500), fixed("Ok", 10_000.6)], variableCents: Number.NaN });
    expect(result.slices.map((slice) => slice.label)).toEqual(["Ok", "Sobra prevista"]);
    expect(result.incomeCents).toBe(100_000);
    expect(result.variableCents).toBe(0);
  });
});

describe("F05 · percentages", () => {
  it("always add up to exactly 100%", () => {
    expect(shares([1, 1, 1])).toEqual([3334, 3333, 3333]);
    expect(sum(shares([1, 2, 3, 5, 7, 11, 13]))).toBe(10_000);
    expect(shares([0, 0])).toEqual([0, 0]);
    expect(shares([5])).toEqual([10_000]);
  });
});

describe("F05 · the items are exactly what the 'Fixos' figure already counts", () => {
  type Posting = { amountCents: number; description: string; merchant: string | null; subscriptionId?: string | null };
  const names = ["Gasolina", "Cabelo", "Netflix", "Diarista", "Academia", "Condomínio"];
  const pick = (seed: number, offset: number) => names[(seed * 7 + offset * 3) % names.length];

  it("sums to calculateFixedExpenses().amountCents for any combination of plans, postings and subscriptions", () => {
    for (let seed = 1; seed <= 400; seed++) {
      const planned = Array.from({ length: seed % 5 }, (_, i) => ({ id: `p${i}`, name: pick(seed, i), amountCents: ((seed + i) * 997) % 50_000 + 100 }));
      const recurring: Posting[] = Array.from({ length: (seed >> 1) % 5 }, (_, i) => ({ amountCents: ((seed + i) * 1013) % 60_000 + 50, description: pick(seed, i + 1), merchant: i % 2 ? pick(seed, i + 2) : null }));
      const subscriptions = Array.from({ length: (seed >> 2) % 4 }, (_, i) => ({ id: `s${i}`, name: pick(seed, i + 3), merchant: null, amountCents: ((seed + i) * 1031) % 30_000 + 200, billingCycle: ["MONTHLY", "YEARLY", "WEEKLY", "QUARTERLY"][(seed + i) % 4], customDays: null }));
      const expected = calculateFixedExpenses(recurring, subscriptions, planned).amountCents;
      expect(sum(fixedExpenseItems(recurring, subscriptions, planned).map((item) => item.cents))).toBe(expected);
    }
  });

  it("never lists a subscription that a planned expense or a posting already covers", () => {
    const items = fixedExpenseItems([{ amountCents: 4_990, description: "Netflix", merchant: null }], [{ id: "s1", name: "Netflix", merchant: null, amountCents: 4_990, billingCycle: "MONTHLY", customDays: null }, { id: "s2", name: "Spotify", merchant: null, amountCents: 2_190, billingCycle: "MONTHLY", customDays: null }], [{ id: "p1", name: "Cabelo", amountCents: 12_000 }]);
    expect(items.map((item) => [item.kind, item.name, item.cents]).sort()).toEqual([["FIXED", "Cabelo", 12_000], ["RECURRING", "Netflix", 4_990], ["SUBSCRIPTION", "Spotify", 2_190]]);
  });

  it("shows what was posted above the plan as its own line, so nothing is dropped or counted twice", () => {
    const items = fixedExpenseItems([{ amountCents: 55_000, description: "Gasolina", merchant: null }], [], [{ id: "p1", name: "Gasolina", amountCents: 40_000 }]);
    expect(items).toEqual([expect.objectContaining({ kind: "FIXED", name: "Gasolina", cents: 40_000, plannedCents: 40_000, postedCents: 55_000 }), expect.objectContaining({ name: "Gasolina (acima do previsto)", cents: 15_000 })]);
    expect(sum(items.map((item) => item.cents))).toBe(55_000);
  });

  it("monthly equivalent of a yearly subscription, the same one the card uses", () => {
    const [item] = fixedExpenseItems([], [{ id: "s", name: "Seguro", merchant: null, amountCents: 120_000, billingCycle: "YEARLY", customDays: null }]);
    expect(item.cents).toBe(10_000);
  });
});
