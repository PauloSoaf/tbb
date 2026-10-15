import { beforeEach, describe, expect, it } from "vitest";
import { summarizeCardStatements, type StatementRow } from "../card-statements";
import { outstandingOf } from "../statement-payment";
import { applyStatementPayment, PAYMENT_EVENT, PAYMENT_UNDONE_EVENT, undoableManualPayments, undoStatementPayment, type PaymentDb, type PaymentInput } from "../statement-payment-service";

type Stmt = { id: string; workspaceId: string; accountId: string; kind: "STATEMENT" | "MONTHLY_PROJECTION"; status: "OPEN" | "PAID" | "FUTURE_KNOWN" | "FORECAST"; amountCents: number; dueDate: Date | null; paidAt: Date | null; sourceAsOf: Date | null; amountIsOutstanding: boolean; rolledIntoStatementId: string | null; updatedAt: Date; referenceMonth: string };
type Pay = { id: string; workspaceId: string; accountId: string; cardStatementId: string; fingerprint: string; amountCents: number; date: Date | null; origin: string; sourceId: string; locator: string };
type Ev = { id: string; workspaceId: string; actorUserId: string; type: string; entityType: string; entityId: string; metadata: Record<string, unknown>; createdAt: Date };
type Purchase = { workspaceId: string; cardStatementId: string; type: "EXPENSE" | "REFUND"; amountCents: number; statementDetailMode: string };

const D = (value: string) => new Date(`${value}T00:00:00.000Z`);
const OWNER = { workspaceId: "w1", userId: "u1", role: "OWNER" };

/** In-memory stand-in for the four tables the service may touch, with the same lock and uniqueness rules. */
function fake() {
  const statements: Stmt[] = [], payments: Pay[] = [], events: Ev[] = [], purchases: Purchase[] = [], touched = new Set<string>();
  let sequence = 0;
  const match = (row: Record<string, unknown>, where: Record<string, unknown>) => Object.entries(where).every(([key, value]) => {
    if (value instanceof Date) return (row[key] as Date | null)?.getTime() === value.getTime();
    if (value && typeof value === "object" && "in" in (value as object)) return ((value as { in: unknown[] }).in).includes(row[key]);
    return row[key] === value;
  });
  const db = {
    cardStatement: {
      findFirst: async ({ where, include }: { where: Record<string, unknown>; include?: unknown }) => {
        const row = statements.find((item) => match(item, where));
        return row ? { ...row, ...(include ? { payments: payments.filter((pay) => pay.cardStatementId === row.id).map(({ amountCents, date }) => ({ amountCents, date })) } : {}) } : null;
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<Stmt> }) => {
        const rows = statements.filter((item) => match(item, where));
        rows.forEach((row) => Object.assign(row, data));
        return { count: rows.length };
      },
    },
    cardStatementPayment: {
      findUnique: async ({ where }: { where: { workspaceId_fingerprint: { workspaceId: string; fingerprint: string } } }) => payments.find((pay) => pay.workspaceId === where.workspaceId_fingerprint.workspaceId && pay.fingerprint === where.workspaceId_fingerprint.fingerprint) ?? null,
      create: async ({ data }: { data: Omit<Pay, "id"> }) => {
        if (payments.some((pay) => pay.workspaceId === data.workspaceId && pay.fingerprint === data.fingerprint)) throw new Error("Unique constraint failed");
        if (data.origin === "DOCUMENT" && !data.date) throw new Error("CHECK document date");
        const row = { ...data, id: `pay-${++sequence}` }; payments.push(row); return { id: row.id };
      },
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        const doomed = payments.filter((pay) => match(pay, where));
        doomed.forEach((pay) => payments.splice(payments.indexOf(pay), 1));
        return { count: doomed.length };
      },
    },
    financeTransaction: { findMany: async ({ where }: { where: Record<string, unknown> }) => purchases.filter((item) => item.workspaceId === where.workspaceId && item.cardStatementId === where.cardStatementId && item.statementDetailMode === where.statementDetailMode) },
    activityEvent: {
      create: async ({ data }: { data: Omit<Ev, "id" | "createdAt"> }) => { const row = { ...data, id: `ev-${++sequence}`, createdAt: new Date(Date.UTC(2032, 9, 12, 12, 0, sequence)) }; events.push(row); return row; },
      findMany: async ({ where }: { where: { workspaceId: string; entityId: { in: string[] }; type: { in: string[] } } }) => events.filter((ev) => ev.workspaceId === where.workspaceId && where.entityId.in.includes(ev.entityId) && where.type.in.includes(ev.type)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    },
  };
  const proxy = new Proxy(db, { get(target, key: string) { touched.add(key); if (!(key in target)) throw new Error(`forbidden table: ${key}`); return target[key as keyof typeof target]; } });
  return { db: proxy as unknown as PaymentDb, statements, payments, events, purchases, touched };
}

const statement = (patch: Partial<Stmt> = {}): Stmt => ({ id: "oct", workspaceId: "w1", accountId: "card", kind: "STATEMENT", status: "OPEN", amountCents: 500_000, dueDate: D("2032-10-01"), paidAt: null, sourceAsOf: D("2032-09-24"), amountIsOutstanding: false, rolledIntoStatementId: null, updatedAt: new Date("2032-10-10T10:00:00.000Z"), referenceMonth: "2032-10", ...patch });
const november = (): Stmt => statement({ id: "nov", amountCents: 570_000, dueDate: D("2032-11-03"), referenceMonth: "2032-11", updatedAt: new Date("2032-10-10T10:00:01.000Z") });
const input = (s: Stmt, patch: Partial<PaymentInput> = {}): PaymentInput => ({ statementId: s.id, version: s.updatedAt.toISOString(), mode: "FULL", amountCents: null, paidOn: "2032-10-05", unknownDate: false, nextStatementId: null, carryIncluded: false, confirmed: true, token: `token-${Math.random().toString(36).slice(2)}-abcdefgh`, today: "2032-10-12", ...patch });
const rowsOf = (f: ReturnType<typeof fake>): StatementRow[] => f.statements.map((s) => {
  const lines = f.payments.filter((p) => p.cardStatementId === s.id).map((p) => ({ amountCents: p.amountCents, date: p.date ? p.date.toISOString().slice(0, 10) : null }));
  const { effectiveCents, paidCents } = outstandingOf({ status: s.status, declaredCents: s.amountCents, addedCents: 0, amountIsOutstanding: s.amountIsOutstanding, sourceAsOf: s.sourceAsOf?.toISOString().slice(0, 10) ?? null, payments: lines });
  return { id: s.id, accountId: s.accountId, accountName: "Cartão sintético", kind: s.kind, status: s.status, amountCents: effectiveCents, dueDate: s.dueDate?.toISOString().slice(0, 10) ?? null, closingDate: null, closingDay: null, referenceMonth: s.referenceMonth, paidAt: s.paidAt?.toISOString().slice(0, 10) ?? null, reconciliation: "NOT_REQUIRED", overlapsStatementId: null, notes: null, rolledIntoStatementId: s.rolledIntoStatementId, paidCents, declaredCents: s.amountCents };
});

let f: ReturnType<typeof fake>;
beforeEach(() => { f = fake(); f.statements.push(statement(), november()); });
const oct = () => f.statements.find((s) => s.id === "oct")!;
const nov = () => f.statements.find((s) => s.id === "nov")!;

describe("F03 · settling a bill", () => {
  it("pays it in full: records one manual payment, closes the bill and leaves the ledger alone", async () => {
    const outcome = await applyStatementPayment(f.db, OWNER, input(oct()));
    expect(outcome).toMatchObject({ already: false });
    expect(outcome.message).toContain("Fatura marcada como paga");
    expect(oct()).toMatchObject({ status: "PAID", paidAt: D("2032-10-05"), rolledIntoStatementId: null, amountCents: 500_000 });
    expect(f.payments).toEqual([expect.objectContaining({ amountCents: 500_000, date: D("2032-10-05"), origin: "MANUAL_VERIFIED", cardStatementId: "oct", workspaceId: "w1" })]);
    expect(summarizeCardStatements(rowsOf(f), "2032-10-12").openCents).toBe(570_000);
    // The service has no handle on purchases other than a read, and creates no transaction of any kind.
    expect(f.purchases).toEqual([]);
    expect([...f.touched].sort()).toEqual(["activityEvent", "cardStatement", "cardStatementPayment", "financeTransaction"]);
  });

  it("does not mark a bill paid with a partial payment: it stays open with the balance reduced", async () => {
    await applyStatementPayment(f.db, OWNER, input(oct(), { mode: "PARTIAL", amountCents: 200_000 }));
    expect(oct()).toMatchObject({ status: "OPEN", paidAt: null });
    const summary = summarizeCardStatements(rowsOf(f), "2032-10-12");
    expect(summary.open.find((row) => row.id === "oct")?.amountCents).toBe(300_000);
    expect(summary.openCents).toBe(300_000 + 570_000);
    expect(summary.paid).toHaveLength(0);
  });

  it("accepts several partial payments and then the settlement of what is left", async () => {
    await applyStatementPayment(f.db, OWNER, input(oct(), { mode: "PARTIAL", amountCents: 200_000, paidOn: "2032-10-02" }));
    await applyStatementPayment(f.db, OWNER, input(oct(), { mode: "PARTIAL", amountCents: 100_000, paidOn: "2032-10-03" }));
    await applyStatementPayment(f.db, OWNER, input(oct(), { mode: "FULL", paidOn: "2032-10-04" }));
    expect(f.payments.map((p) => p.amountCents)).toEqual([200_000, 100_000, 200_000]);
    expect(oct().status).toBe("PAID");
    expect(summarizeCardStatements(rowsOf(f), "2032-10-12").openCents).toBe(570_000);
  });

  it("includes purchases added on top of the declared amount in what is owed", async () => {
    f.purchases.push({ workspaceId: "w1", cardStatementId: "oct", type: "EXPENSE", amountCents: 20_000, statementDetailMode: "ADDED_TO_STATEMENT" });
    await applyStatementPayment(f.db, OWNER, input(oct(), { mode: "FULL" }));
    expect(f.payments[0].amountCents).toBe(520_000);
  });

  it("keeps an unknown payment day unknown", async () => {
    await applyStatementPayment(f.db, OWNER, input(oct(), { unknownDate: true }));
    expect(f.payments[0].date).toBeNull();
    expect(oct()).toMatchObject({ status: "PAID", paidAt: null });
  });
});

describe("F03 · carrying the balance to the next bill", () => {
  const carry = () => input(oct(), { mode: "CARRY", amountCents: 100_000, nextStatementId: "nov", carryIncluded: true, unknownDate: true });

  it("closes the old bill, links it to the next one and never counts the carried balance twice", async () => {
    const outcome = await applyStatementPayment(f.db, OWNER, carry());
    expect(outcome.plan?.carry).toEqual({ nextId: "nov", cents: 400_000 });
    expect(oct()).toMatchObject({ status: "PAID", rolledIntoStatementId: "nov", paidAt: null });
    expect(f.payments).toEqual([expect.objectContaining({ amountCents: 100_000, date: null, origin: "MANUAL_VERIFIED" })]);
    expect(nov().amountCents).toBe(570_000); // the next bill's own figure is untouched
    const summary = summarizeCardStatements(rowsOf(f), "2032-10-12");
    expect(summary.openCents).toBe(570_000); // only the next bill is owed: 4.000 is inside it
    expect(summary.open.map((row) => row.id)).toEqual(["nov"]);
    expect(summary.carried.map((row) => row.id)).toEqual(["oct"]);
  });

  it("refuses when the user did not confirm the carried balance is already in the next bill", async () => {
    await expect(applyStatementPayment(f.db, OWNER, { ...carry(), carryIncluded: false })).rejects.toThrow("já está incluído no total da fatura seguinte");
    expect(f.payments).toHaveLength(0);
    expect(oct().status).toBe("OPEN");
  });

  it("refuses a next bill of another card, an earlier one, or one from another workspace", async () => {
    f.statements.push(statement({ id: "other-card", accountId: "other", dueDate: D("2032-11-03"), referenceMonth: "2032-11" }), statement({ id: "foreign", workspaceId: "w2", dueDate: D("2032-11-03"), referenceMonth: "2032-11" }), statement({ id: "earlier", dueDate: D("2032-09-01"), referenceMonth: "2032-09" }));
    for (const nextStatementId of ["other-card", "foreign", "earlier"]) {
      await expect(applyStatementPayment(f.db, OWNER, { ...carry(), nextStatementId })).rejects.toThrow();
    }
    expect(f.payments).toHaveLength(0);
    expect(oct().rolledIntoStatementId).toBeNull();
  });

  it("works without any payment: the whole balance moves on", async () => {
    await applyStatementPayment(f.db, OWNER, { ...carry(), amountCents: null });
    expect(f.payments).toHaveLength(0);
    expect(oct()).toMatchObject({ status: "PAID", rolledIntoStatementId: "nov" });
  });
});

describe("F03 · closing a bill that already carried its balance (a payment and the link are already recorded)", () => {
  const rolledBill = () => {
    oct().rolledIntoStatementId = "nov";
    f.payments.push({ id: "doc", workspaceId: "w1", accountId: "card", cardStatementId: "oct", fingerprint: "doc-fp", amountCents: 100_000, date: D("2032-10-02"), origin: "DOCUMENT", sourceId: "src", locator: "l" });
  };
  const close = (patch: Partial<PaymentInput> = {}) => input(oct(), { mode: "CLOSE_CARRIED", paidOn: null, ...patch });

  it("marks it paid on the day of its last recorded payment, keeping the link, the payment and every amount", async () => {
    rolledBill();
    const outcome = await applyStatementPayment(f.db, OWNER, close({ note: "applied on the owner's behalf" }));
    expect(outcome.message).toContain("Fatura encerrada como paga");
    expect(oct()).toMatchObject({ status: "PAID", paidAt: D("2032-10-02"), rolledIntoStatementId: "nov", amountCents: 500_000 });
    expect(f.payments.map((p) => [p.id, p.amountCents, p.origin])).toEqual([["doc", 100_000, "DOCUMENT"]]); // nothing new, nothing removed
    expect(nov().amountCents).toBe(570_000);
    const summary = summarizeCardStatements(rowsOf(f), "2032-10-12");
    expect(summary.openCents).toBe(570_000); // the debt did not move: it was already excluded
    expect(summary.paid.map((row) => row.id)).toEqual(["oct"]);
    expect(summary.carried.map((row) => row.id)).toEqual(["oct"]);
    expect(f.events[0].metadata).toMatchObject({ mode: "CLOSE_CARRIED", amountCents: 0, paymentId: null, note: "applied on the owner's behalf", before: { status: "OPEN", rolledIntoStatementId: "nov" }, after: { status: "PAID", paidAt: "2032-10-02", rolledIntoStatementId: "nov" } });
  });

  it("leaves the day unknown when the user says so, or when no payment was ever recorded", async () => {
    rolledBill();
    await applyStatementPayment(f.db, OWNER, close({ unknownDate: true }));
    expect(oct().paidAt).toBeNull();
    f.payments.length = 0; oct().status = "OPEN"; oct().updatedAt = new Date("2032-10-11T00:00:00.000Z");
    await applyStatementPayment(f.db, OWNER, close());
    expect(oct()).toMatchObject({ status: "PAID", paidAt: null });
  });

  it("refuses a bill that never carried its balance, and a repeated request is a harmless no-op", async () => {
    await expect(applyStatementPayment(f.db, OWNER, close())).rejects.toThrow("não tem saldo transportado");
    rolledBill();
    await applyStatementPayment(f.db, OWNER, close());
    expect(await applyStatementPayment(f.db, OWNER, close({ token: "second-token-abcdefghijklmnop" }))).toMatchObject({ already: true });
    expect(f.events).toHaveLength(1);
  });

  it("can be undone: the bill reopens with its link and payment intact", async () => {
    rolledBill();
    await applyStatementPayment(f.db, OWNER, close());
    await undoStatementPayment(f.db, OWNER, { statementId: "oct", version: oct().updatedAt.toISOString(), confirmed: true });
    expect(oct()).toMatchObject({ status: "OPEN", paidAt: null, rolledIntoStatementId: "nov" });
    expect(f.payments.map((p) => p.id)).toEqual(["doc"]);
  });

  it("is owner-only like every other payment action", async () => {
    rolledBill();
    await expect(applyStatementPayment(f.db, { ...OWNER, role: "MEMBER" }, close())).rejects.toThrow("Somente o titular");
    expect(oct().status).toBe("OPEN");
  });
});

describe("F03 · duplicates, retries and concurrency", () => {
  it("a repeated request with the same token creates no second payment", async () => {
    const request = input(oct(), { mode: "PARTIAL", amountCents: 100_000 });
    await applyStatementPayment(f.db, OWNER, request);
    const again = await applyStatementPayment(f.db, OWNER, request);
    expect(again).toEqual({ already: true, message: "Este pagamento já estava registrado." });
    expect(f.payments).toHaveLength(1);
    expect(f.events).toHaveLength(1);
  });

  it("repeating a no-payment carry-over is a no-op, not an error", async () => {
    const request = input(oct(), { mode: "CARRY", amountCents: null, nextStatementId: "nov", carryIncluded: true });
    await applyStatementPayment(f.db, OWNER, request);
    expect(await applyStatementPayment(f.db, OWNER, { ...request, token: "another-token-for-the-retry-abcd" })).toMatchObject({ already: true });
    expect(f.events).toHaveLength(1);
  });

  it("refuses a different request that equals a payment already recorded on that bill", async () => {
    await applyStatementPayment(f.db, OWNER, input(oct(), { mode: "PARTIAL", amountCents: 100_000, paidOn: "2032-10-02" }));
    await expect(applyStatementPayment(f.db, OWNER, input(oct(), { mode: "PARTIAL", amountCents: 100_000, paidOn: "2032-10-02" }))).rejects.toThrow("mesmo valor e data");
    expect(f.payments).toHaveLength(1);
  });

  it("refuses to act on a bill that changed after the user opened the dialog", async () => {
    const stale = input(oct());
    oct().updatedAt = new Date("2032-10-11T09:00:00.000Z");
    await expect(applyStatementPayment(f.db, OWNER, stale)).rejects.toThrow("Esta fatura mudou");
    expect(f.payments).toHaveLength(0);
  });

  it("writes nothing when the bill changes between reading and updating", async () => {
    const request = input(oct());
    const original = f.db.cardStatement.updateMany.bind(f.db.cardStatement);
    (f.db.cardStatement as { updateMany: unknown }).updateMany = async (args: Parameters<typeof original>[0]) => { oct().updatedAt = new Date("2032-10-11T09:00:00.000Z"); return original(args); };
    await expect(applyStatementPayment(f.db, OWNER, request)).rejects.toThrow("mudou durante o registro");
    expect(oct().status).toBe("OPEN");
  });

  it("rejects an already paid bill", async () => {
    await applyStatementPayment(f.db, OWNER, input(oct()));
    await expect(applyStatementPayment(f.db, OWNER, input(oct()))).rejects.toThrow("já está paga");
  });
});

describe("F03 · who can do it", () => {
  it("only the owner, only inside the session's workspace", async () => {
    await expect(applyStatementPayment(f.db, { ...OWNER, role: "MEMBER" }, input(oct()))).rejects.toThrow("Somente o titular");
    await expect(applyStatementPayment(f.db, { ...OWNER, workspaceId: "w2" }, input(oct()))).rejects.toThrow("não encontrada");
    expect(f.payments).toHaveLength(0);
  });
  it("needs the explicit confirmation and a well-formed request token", async () => {
    await expect(applyStatementPayment(f.db, OWNER, input(oct(), { confirmed: false }))).rejects.toThrow("Confirme");
    await expect(applyStatementPayment(f.db, OWNER, input(oct(), { token: "x" }))).rejects.toThrow("Pedido inválido");
  });
  it("applies the bank-balance rule on the server too", async () => {
    oct().amountIsOutstanding = true;
    await expect(applyStatementPayment(f.db, OWNER, input(oct(), { mode: "PARTIAL", amountCents: 1_000, paidOn: "2032-09-24" }))).rejects.toThrow("já considera pagamentos até 24/09/2032");
  });
});

describe("F03 · audit trail and undo", () => {
  it("records who, what and the state before and after", async () => {
    await applyStatementPayment(f.db, OWNER, { ...input(oct(), { mode: "CARRY", amountCents: 100_000, nextStatementId: "nov", carryIncluded: true }), token: "audit-token-1234567890abcd" });
    expect(f.events).toHaveLength(1);
    expect(f.events[0]).toMatchObject({ type: PAYMENT_EVENT, workspaceId: "w1", actorUserId: "u1", entityType: "CardStatement", entityId: "oct" });
    expect(f.events[0].metadata).toMatchObject({ mode: "CARRY", amountCents: 100_000, carriedCents: 400_000, nextStatementId: "nov", outstandingBeforeCents: 500_000, outstandingAfterCents: 0,
      before: { status: "OPEN", rolledIntoStatementId: null }, after: { status: "PAID", rolledIntoStatementId: "nov" } });
    expect(JSON.stringify(f.events[0].metadata)).not.toMatch(/password|cpf|account number|agência/i);
  });

  it("undoes the last manual payment: the bill reopens, the payment is deleted and the link is removed", async () => {
    await applyStatementPayment(f.db, OWNER, input(oct(), { mode: "CARRY", amountCents: 100_000, nextStatementId: "nov", carryIncluded: true }));
    const result = await undoStatementPayment(f.db, OWNER, { statementId: "oct", version: oct().updatedAt.toISOString(), confirmed: true });
    expect(result.message).toContain("voltou a ficar aberta");
    expect(oct()).toMatchObject({ status: "OPEN", paidAt: null, rolledIntoStatementId: null });
    expect(f.payments).toHaveLength(0);
    expect(f.events.map((event) => event.type)).toEqual([PAYMENT_EVENT, PAYMENT_UNDONE_EVENT]);
    expect(summarizeCardStatements(rowsOf(f), "2032-10-12").openCents).toBe(500_000 + 570_000);
    await expect(undoStatementPayment(f.db, OWNER, { statementId: "oct", version: oct().updatedAt.toISOString(), confirmed: true })).rejects.toThrow("Não há pagamento manual");
  });

  it("undoes payments in reverse order and lists only the latest one as undoable", async () => {
    await applyStatementPayment(f.db, OWNER, input(oct(), { mode: "PARTIAL", amountCents: 100_000, paidOn: "2032-10-02" }));
    await applyStatementPayment(f.db, OWNER, input(oct(), { mode: "PARTIAL", amountCents: 50_000, paidOn: "2032-10-03" }));
    expect((await undoableManualPayments(f.db, "w1", ["oct", "nov"])).get("oct")?.metadata.amountCents).toBe(50_000);
    await undoStatementPayment(f.db, OWNER, { statementId: "oct", version: oct().updatedAt.toISOString(), confirmed: true });
    expect(f.payments.map((p) => p.amountCents)).toEqual([100_000]);
    expect((await undoableManualPayments(f.db, "w1", ["oct"])).get("oct")?.metadata.amountCents).toBe(100_000);
  });

  it("refuses to undo after the bill was changed by something else, and never touches document payments", async () => {
    await applyStatementPayment(f.db, OWNER, input(oct()));
    f.payments.push({ id: "doc", workspaceId: "w1", accountId: "card", cardStatementId: "oct", fingerprint: "doc-fp", amountCents: 1_000, date: D("2032-09-30"), origin: "DOCUMENT", sourceId: "src", locator: "l" });
    oct().rolledIntoStatementId = "nov"; // edited elsewhere after the payment
    await expect(undoStatementPayment(f.db, OWNER, { statementId: "oct", version: oct().updatedAt.toISOString(), confirmed: true })).rejects.toThrow("mudou depois do pagamento");
    oct().rolledIntoStatementId = null;
    await undoStatementPayment(f.db, OWNER, { statementId: "oct", version: oct().updatedAt.toISOString(), confirmed: true });
    expect(f.payments.map((p) => p.id)).toEqual(["doc"]);
  });

  it("is owner-only and needs confirmation", async () => {
    await applyStatementPayment(f.db, OWNER, input(oct()));
    await expect(undoStatementPayment(f.db, { ...OWNER, role: "ADMIN" }, { statementId: "oct", version: oct().updatedAt.toISOString(), confirmed: true })).rejects.toThrow("Somente o titular");
    await expect(undoStatementPayment(f.db, OWNER, { statementId: "oct", version: oct().updatedAt.toISOString(), confirmed: false })).rejects.toThrow("Confirme");
    expect(oct().status).toBe("PAID");
  });
});
