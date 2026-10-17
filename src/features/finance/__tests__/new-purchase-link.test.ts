import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { newPurchaseStatementLink } from "../new-purchase-link";

const viewer = { workspaceId: "workspace", role: "OWNER" };
function fixture(type = "CREDIT_CARD", status = "OPEN") {
  const account = vi.fn().mockResolvedValue(type === "CREDIT_CARD" ? { id: "card" } : null);
  const statements = vi.fn().mockResolvedValue([{ id: "bill", accountId: "card", kind: "STATEMENT", status, dueDate: new Date("2032-11-03"), closingDate: new Date("2032-10-26"), closingDay: 26, rolledIntoStatementId: null }]);
  return { account, statements, db: { account: { findFirst: account }, cardStatement: { findMany: statements } } as unknown as Prisma.TransactionClient };
}
describe("new manual purchases update their registered invoice", () => {
  it("adds a new purchase to the unpaid bill for its purchase date, without rewriting its declared base", async () => {
    const f = fixture();
    expect(await newPurchaseStatementLink(f.db, viewer, { accountId: "card", type: "EXPENSE", date: new Date("2032-10-14") })).toEqual({ cardStatementId: "bill", statementDetailMode: "ADDED_TO_STATEMENT", competenceDate: new Date("2032-11-03") });
    expect(f.statements).toHaveBeenCalledWith(expect.objectContaining({ where: { workspaceId: "workspace", accountId: "card", kind: "STATEMENT" } }));
  });
  it("keeps a debit purchase on the bank ledger without reading or changing invoices", async () => {
    const f = fixture("CHECKING");
    expect(await newPurchaseStatementLink(f.db, viewer, { accountId: "bank", type: "EXPENSE", date: new Date("2032-10-14") })).toEqual({});
    expect(f.statements).not.toHaveBeenCalled();
  });
  it("never changes a paid bill or guesses a bill outside the known cycle", async () => {
    const f = fixture("CREDIT_CARD", "PAID");
    expect(await newPurchaseStatementLink(f.db, viewer, { accountId: "card", type: "EXPENSE", date: new Date("2032-10-14") })).toEqual({});
    expect(await newPurchaseStatementLink(f.db, viewer, { accountId: "card", type: "EXPENSE", date: new Date("2032-12-14") })).toEqual({});
  });
  it("does not expose owner statements to another role or link income to a bill", async () => {
    const f = fixture();
    for (const input of [{ role: "MEMBER", type: "EXPENSE" }, { role: "OWNER", type: "INCOME" }]) expect(await newPurchaseStatementLink(f.db, { ...viewer, role: input.role }, { accountId: "card", type: input.type, date: new Date("2032-10-14") })).toEqual({});
    expect(f.account).not.toHaveBeenCalled();
  });
});
