import { describe, expect, it } from "vitest";
import { MATCH_DAYS_AFTER, MATCH_DAYS_BEFORE, matchRowsToOwnTransfers, type OwnTransfer } from "../import-transfer-match";
import { previewCsv } from "../import-engine";

const transfer = (id: string, date: string, amountCents: number, fromAccountId = "origin", toAccountId = "destination"): OwnTransfer => ({ id, date, amountCents, fromAccountId, toAccountId, fromName: "Origin", toName: "Destination" });
const add = (day: string, offset: number) => new Date(Date.parse(`${day}T00:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);

describe("matchRowsToOwnTransfers", () => {
  const transfers = [transfer("t1", "2032-10-15", 3000)];

  it("matches the incoming side on the destination account and the outgoing side on the origin account", () => {
    expect(matchRowsToOwnTransfers([{ index: 0, date: "2032-10-15", amountCents: 3000, type: "INCOME" }], "destination", transfers).get(0)).toEqual({ transactionId: "t1", label: "Origin → Destination", direction: "IN" });
    expect(matchRowsToOwnTransfers([{ index: 0, date: "2032-10-15", amountCents: 3000, type: "EXPENSE" }], "origin", transfers).get(0)).toMatchObject({ transactionId: "t1", direction: "OUT" });
  });

  it("treats a refund-typed credit as incoming money", () => {
    expect(matchRowsToOwnTransfers([{ index: 0, date: "2032-10-15", amountCents: 3000, type: "REFUND" }], "destination", transfers).size).toBe(1);
  });

  it("requires the same account, the same direction and the exact amount", () => {
    const row = { index: 0, date: "2032-10-15", amountCents: 3000, type: "INCOME" };
    expect(matchRowsToOwnTransfers([row], "origin", transfers).size).toBe(0);
    expect(matchRowsToOwnTransfers([{ ...row, type: "EXPENSE" }], "destination", transfers).size).toBe(0);
    expect(matchRowsToOwnTransfers([{ ...row, amountCents: 3001 }], "destination", transfers).size).toBe(0);
    expect(matchRowsToOwnTransfers([{ ...row, amountCents: 2999 }], "destination", transfers).size).toBe(0);
  });

  it("accepts a bank date from ten days before to three days after the registered day, and nothing outside", () => {
    const at = (offset: number) => matchRowsToOwnTransfers([{ index: 0, date: add("2032-10-15", offset), amountCents: 3000, type: "INCOME" }], "destination", transfers).size;
    expect([at(-MATCH_DAYS_BEFORE), at(0), at(MATCH_DAYS_AFTER)]).toEqual([1, 1, 1]);
    expect([at(-MATCH_DAYS_BEFORE - 1), at(MATCH_DAYS_AFTER + 1)]).toEqual([0, 0]);
  });

  it("uses each transfer once, nearest date first, so two identical PIX stay two movements", () => {
    const rows = [{ index: 0, date: "2032-10-10", amountCents: 3000, type: "INCOME" }, { index: 1, date: "2032-10-15", amountCents: 3000, type: "INCOME" }];
    const matches = matchRowsToOwnTransfers(rows, "destination", transfers);
    expect([...matches.keys()]).toEqual([1]);
    expect(matches.get(1)?.transactionId).toBe("t1");
  });

  it("pairs several equal transfers with the closest rows without reusing any", () => {
    const two = [transfer("a", "2032-10-10", 3000), transfer("b", "2032-10-15", 3000)];
    const rows = [{ index: 0, date: "2032-10-15", amountCents: 3000, type: "INCOME" }, { index: 1, date: "2032-10-10", amountCents: 3000, type: "INCOME" }];
    const matches = matchRowsToOwnTransfers(rows, "destination", two);
    expect(matches.get(0)?.transactionId).toBe("b");
    expect(matches.get(1)?.transactionId).toBe("a");
  });
});

describe("previewCsv with registered transfers", () => {
  const content = ["Data;Descrição;Valor", "14/10/2032;PIX recebido de PAULO;30,00", "15/10/2032;Mercado;-12,00", "15/10/2032;PIX recebido de PAULO;30,00"].join("\n");
  const mapping = { date: "Data", description: "Descrição", amount: "Valor", direction: "SIGNED" as const };

  it("flags the bank's view of an own transfer as a duplicate of it and keeps the rest importable", () => {
    const rows = previewCsv(content, mapping, "ws", "destination", new Set(), [], "CSV", [transfer("t1", "2032-10-15", 3000)]);
    // The same-day row is the nearest to the registered day, so it is the one that is the transfer.
    expect(rows.map((row) => [row.duplicate, row.duplicateOf?.transactionId ?? null])).toEqual([[false, null], [false, null], [true, "t1"]]);
  });

  it("changes nothing without registered transfers", () => {
    const rows = previewCsv(content, mapping, "ws", "destination", new Set());
    expect(rows.every((row) => !row.duplicate && !row.duplicateOf)).toBe(true);
  });
});
