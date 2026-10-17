import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { pendingBankLiability, reconcileBankSettlement } from "../planning/bank-settlement";
import { decryptPlanningSecret, encryptPlanningSecret } from "../planning/private-field";
const actor = { workspaceId: "w", userId: "u" }, payment = { id: "payment", accountId: "card", amountCents: 10000, date: "2032-10-10", fingerprint: "payment-fingerprint" };
function fixture() {
  const create = vi.fn().mockResolvedValue({ id: "bank-movement", revision: 0 });
  const findFirst = vi.fn().mockResolvedValue({ id: "existing", amountCents: 10000, currency: "BRL", account: { type: "CHECKING" }, type: "TRANSFER", destinationAccountId: "card", date: new Date("2032-10-10"), revision: 0 });
  const updateMany = vi.fn().mockResolvedValue({ count: 1 }), account = vi.fn().mockResolvedValue({ id: "bank" }), used = vi.fn().mockResolvedValue(null), audit = vi.fn();
  return { create, findFirst, updateMany, account, used, db: { financeTransaction: { create, findFirst }, cardStatementPayment: { updateMany, findFirst: used }, account: { findFirst: account }, activityEvent: { create: audit } } as unknown as Prisma.TransactionClient };
}
describe("optional bank reconciliation", () => {
  it("keeps a pending liability without posting an expense or moving money", async () => {
    const f = fixture(); await reconcileBankSettlement(f.db, actor, payment, { mode: "UNRECONCILED" }, "2032-10-15");
    expect(f.create).not.toHaveBeenCalled(); expect(pendingBankLiability([{ amountCents: 10000, bankReconciliation: "UNRECONCILED" }, { amountCents: 20000, bankReconciliation: "LEGACY_UNKNOWN" }])).toBe(10000);
  });
  it("requires confirmation before treating a status-only payment as already reflected in the bank", async () => {
    const f = fixture(); await expect(reconcileBankSettlement(f.db, actor, payment, { mode: "STATUS_ONLY" }, "2032-10-15")).rejects.toThrow("Confirme");
    await reconcileBankSettlement(f.db, actor, payment, { mode: "STATUS_ONLY", balanceConfirmed: true }, "2032-10-15"); expect(f.create).not.toHaveBeenCalled();
  });
  it("links an existing settlement without creating a second movement", async () => {
    const f = fixture(); const result = await reconcileBankSettlement(f.db, actor, payment, { mode: "LINKED", transactionId: "existing" }, "2032-10-15");
    expect(result.bankTransactionId).toBe("existing"); expect(f.create).not.toHaveBeenCalled();
    expect(f.findFirst.mock.calls[0][0].where).toEqual({ id: "existing", workspaceId: "w" });
  });
  it("creates an explicitly chosen bank-to-card transfer with zero additional consumption", async () => {
    const f = fixture(); await reconcileBankSettlement(f.db, actor, payment, { mode: "CREATED", accountId: "bank" }, "2032-10-15");
    expect(f.create.mock.calls[0][0].data).toMatchObject({ workspaceId: "w", accountId: "bank", destinationAccountId: "card", type: "TRANSFER", isConsumption: false, eventKind: "CARD_SETTLEMENT", amountCents: 10000, fingerprint: "bank:payment-fingerprint" });
  });
  it.each([null, "2032-11-01"])("refuses a bank movement for an unknown or future date %s", async date => {
    const f = fixture(); await expect(reconcileBankSettlement(f.db, actor, { ...payment, date }, { mode: "CREATED", accountId: "bank" }, "2032-10-15")).rejects.toThrow(); expect(f.create).not.toHaveBeenCalled();
  });
  it("refuses a purchase, another card, another amount, or an already used bank movement", async () => {
    const f = fixture(); f.findFirst.mockResolvedValueOnce({ ...await f.findFirst(), type: "EXPENSE", isConsumption: true });
    await expect(reconcileBankSettlement(f.db, actor, payment, { mode: "LINKED", transactionId: "existing" }, "2032-10-15")).rejects.toThrow();
    f.findFirst.mockResolvedValueOnce({ ...await f.findFirst(), destinationAccountId: "other-card" });
    await expect(reconcileBankSettlement(f.db, actor, payment, { mode: "LINKED", transactionId: "existing" }, "2032-10-15")).rejects.toThrow();
    f.findFirst.mockResolvedValueOnce({ ...await f.findFirst(), amountCents: 12000 });
    await expect(reconcileBankSettlement(f.db, actor, payment, { mode: "LINKED", transactionId: "existing" }, "2032-10-15")).rejects.toThrow();
    f.used.mockResolvedValue({ id: "another-payment" }); await expect(reconcileBankSettlement(f.db, actor, payment, { mode: "LINKED", transactionId: "existing" }, "2032-10-15")).rejects.toThrow("outro pagamento");
  });
});
describe("private planning fields", () => {
  beforeEach(() => vi.stubEnv("JWT_SECRET", "synthetic-planning-secret-at-least-32-characters"));
  afterEach(() => vi.unstubAllEnvs());
  it("encrypts PIX identifiers with a random nonce and authenticated encryption", () => {
    const first = encryptPlanningSecret("synthetic@example.invalid"), second = encryptPlanningSecret("synthetic@example.invalid");
    expect(first).not.toBe(second); expect(first).not.toContain("synthetic@"); expect(decryptPlanningSecret(first)).toBe("synthetic@example.invalid");
    const parts = first.split("."); parts[2] = Buffer.alloc(16).toString("base64url"); expect(() => decryptPlanningSecret(parts.join("."))).toThrow();
  });
  it("does not silently store plaintext when the encryption key is missing", () => { vi.stubEnv("JWT_SECRET", ""); expect(() => encryptPlanningSecret("private")).toThrow("configurada"); });
});
