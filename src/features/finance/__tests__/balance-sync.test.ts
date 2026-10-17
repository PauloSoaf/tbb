import { describe, expect, it } from "vitest";
import { bankKey, planBalanceSync, suggestTransfers, type BalanceSyncSuggestionRow, type BalanceSyncTransfer } from "../balance-sync";

const row = (accountId: string, groupKey: string, currentCents: number, desiredCents: number, reserve = false): BalanceSyncSuggestionRow => ({ accountId, groupKey, reserve, currentCents, desiredCents });

/** Net effect of a plan on every account, to prove the plan lands on the balances that were typed. */
function applied(rows: BalanceSyncSuggestionRow[], transfers: BalanceSyncTransfer[]) {
  const plan = planBalanceSync(rows, transfers);
  const balances = new Map(rows.map((r) => [r.accountId, r.currentCents]));
  for (const t of plan.transfers) {
    balances.set(t.fromAccountId, (balances.get(t.fromAccountId) ?? 0) - t.amountCents);
    balances.set(t.toAccountId, (balances.get(t.toAccountId) ?? 0) + t.amountCents);
  }
  for (const a of plan.adjustments) balances.set(a.accountId, balances.get(a.accountId)! + a.amountCents);
  return { plan, balances };
}

describe("planBalanceSync", () => {
  it("leaves nothing to adjust when the declared transfers explain every balance", () => {
    const rows = [row("a", "x", 1000, 700), row("b", "y", 0, 300)];
    expect(planBalanceSync(rows, [{ fromAccountId: "a", toAccountId: "b", amountCents: 300 }])).toEqual({ transfers: [{ fromAccountId: "a", toAccountId: "b", amountCents: 300 }], adjustments: [] });
  });

  it("keeps the unexplained part as a signed adjustment on the typed account", () => {
    const { plan } = applied([row("a", "x", 1000, 600), row("b", "y", 0, 300)], [{ fromAccountId: "a", toAccountId: "b", amountCents: 300 }]);
    expect(plan.adjustments).toEqual([{ accountId: "a", amountCents: -100 }]);
  });

  it("adjusts everything when no transfer is declared", () => {
    expect(planBalanceSync([row("a", "x", 1000, 400), row("b", "y", 0, 600)], []).adjustments).toEqual([{ accountId: "a", amountCents: -600 }, { accountId: "b", amountCents: 600 }]);
  });

  it("moves an account that only appears in a transfer without adjusting it", () => {
    const plan = planBalanceSync([row("a", "x", 1000, 700)], [{ fromAccountId: "a", toAccountId: "untouched", amountCents: 300 }]);
    expect(plan.adjustments).toEqual([]);
  });

  it("can overshoot a balance, in which case the adjustment has the opposite sign", () => {
    expect(planBalanceSync([row("a", "x", 1000, 700), row("b", "y", 0, 300)], [{ fromAccountId: "a", toAccountId: "b", amountCents: 500 }]).adjustments).toEqual([{ accountId: "a", amountCents: 200 }, { accountId: "b", amountCents: -200 }]);
  });
});

describe("suggestTransfers", () => {
  it("pairs an exact outflow with the matching inflow", () => {
    expect(suggestTransfers([row("a", "x", 1000, 700), row("b", "y", 0, 300)])).toEqual([{ fromAccountId: "a", toAccountId: "b", amountCents: 300 }]);
  });

  it("never pairs two banks that moved in the same direction", () => {
    expect(suggestTransfers([row("a", "x", 0, 500), row("b", "y", 0, 200)])).toEqual([]);
    expect(suggestTransfers([row("a", "x", 500, 0), row("b", "y", 200, 0)])).toEqual([]);
  });

  it("tells the real story when stale balances leave cents: whole-real PIX amounts, a refill from the piggy bank, and the noise on the piggy bank", () => {
    // Bank X has an account (-4,60) and a piggy bank (-15,37); bank Y an account (-10,13); bank Z received 30,00.
    const rows = [row("x-account", "x", 1000, 540), row("x-piggy", "x", 5000, 3463, true), row("y-account", "y", 2000, 987), row("z-account", "z", 0, 3000)];
    const transfers = suggestTransfers(rows);
    expect(transfers).toEqual([
      { fromAccountId: "x-account", toAccountId: "z-account", amountCents: 2000 },
      { fromAccountId: "y-account", toAccountId: "z-account", amountCents: 1000 },
      { fromAccountId: "x-piggy", toAccountId: "x-account", amountCents: 1540 },
    ]);
    const { plan, balances } = applied(rows, transfers);
    // The spendable account lands on its typed balance exactly; the cents are the piggy bank's accrual and an unknown debit.
    expect(plan.adjustments).toEqual([{ accountId: "x-piggy", amountCents: 3 }, { accountId: "y-account", amountCents: -13 }]);
    expect([...balances].map(([id, cents]) => [id, cents])).toEqual([["x-account", 540], ["x-piggy", 3463], ["y-account", 987], ["z-account", 3000]]);
  });

  it("keeps exact cents when the exact outflows already match what arrived", () => {
    const transfers = suggestTransfers([row("a", "x", 1234, 0), row("b", "y", 0, 1234)]);
    expect(transfers).toEqual([{ fromAccountId: "a", toAccountId: "b", amountCents: 1234 }]);
  });

  it("falls back to the exact outflows when rounding would not explain the inflow either", () => {
    const transfers = suggestTransfers([row("a", "x", 1250, 0), row("b", "y", 0, 2000)]);
    expect(transfers).toEqual([{ fromAccountId: "a", toAccountId: "b", amountCents: 1250 }]);
  });

  it("sends from the spendable account even when only the piggy bank lost money", () => {
    const rows = [row("acct", "x", 0, 0), row("piggy", "x", 2000, 0, true), row("dest", "y", 0, 2000)];
    const transfers = suggestTransfers(rows);
    expect(transfers).toEqual([
      { fromAccountId: "acct", toAccountId: "dest", amountCents: 2000 },
      { fromAccountId: "piggy", toAccountId: "acct", amountCents: 2000 },
    ]);
    expect(applied(rows, transfers).plan.adjustments).toEqual([]);
  });

  it("deposits into the piggy bank through the spendable account inside one bank", () => {
    const rows = [row("acct", "x", 5000, 3000), row("piggy", "x", 1000, 3000, true)];
    const transfers = suggestTransfers(rows);
    expect(transfers).toEqual([{ fromAccountId: "acct", toAccountId: "piggy", amountCents: 2000 }]);
  });

  it("always lands every account on the typed balance and only proposes sane transfers", () => {
    let seed = 11;
    const next = (max: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % max; };
    for (let round = 0; round < 400; round += 1) {
      const rows = Array.from({ length: 2 + next(6) }, (_, index) => row(`acc-${index}`, `bank-${next(3)}`, next(200000) - 50000, next(200000) - 50000, next(3) === 0));
      const transfers = suggestTransfers(rows);
      const { balances } = applied(rows, transfers);
      for (const r of rows) expect(balances.get(r.accountId)).toBe(r.desiredCents);
      for (const t of transfers) {
        expect(t.amountCents).toBeGreaterThan(0);
        expect(t.fromAccountId).not.toBe(t.toAccountId);
        expect(rows.some((r) => r.accountId === t.fromAccountId) && rows.some((r) => r.accountId === t.toAccountId)).toBe(true);
      }
      expect(transfers.length).toBeLessThanOrEqual(20);
    }
  });

  it("is deterministic regardless of row order", () => {
    const rows = [row("z", "g1", 500, 0), row("y", "g2", 500, 0), row("b", "g3", 0, 500), row("a", "g4", 0, 500)];
    expect(suggestTransfers(rows)).toEqual(suggestTransfers([...rows].reverse()));
  });
});

describe("bankKey", () => {
  it("groups products of the same bank with or without a saved institution", () => {
    const base = { id: "id" };
    expect(bankKey({ ...base, institution: "Itaú", name: "Qualquer" })).toBe(bankKey({ ...base, institution: null, name: "Itaú · Conta" }));
    expect(bankKey({ ...base, institution: null, name: "PicPay · Cofrinho" })).toBe(bankKey({ ...base, institution: "PicPay", name: "PicPay · Conta" }));
    expect(bankKey({ ...base, institution: null, name: "Nubank" })).not.toBe(bankKey({ ...base, institution: null, name: "Santander" }));
  });
});
