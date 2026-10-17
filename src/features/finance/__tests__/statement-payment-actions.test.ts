import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ permission: vi.fn(), transaction: vi.fn(), apply: vi.fn(), undo: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/workspace", () => ({ requirePermission: mocks.permission }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("../statement-payment-service", () => ({ applyStatementPayment: mocks.apply, undoStatementPayment: mocks.undo }));

import { registerStatementPayment, undoManualStatementPayment } from "../statement-actions";

const session = (role = "OWNER") => ({ workspaceId: "w1", userId: "u1", role, workspace: { timezone: "America/Manaus" } });
const form = (entries: Record<string, string>) => { const fd = new FormData(); Object.entries(entries).forEach(([key, value]) => fd.set(key, value)); return fd; };
const valid = { id: "s1", version: "v1", mode: "PARTIAL", amount: "1.000,00", paidOn: "2032-10-05", token: "token-1234567890abcdef", confirm: "on" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.permission.mockResolvedValue(session());
  mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({}));
  mocks.apply.mockResolvedValue({ already: false, message: "Pagamento de R$ 1.000,00 registrado." });
  mocks.undo.mockResolvedValue({ message: "Pagamento desfeito." });
});

describe("registerStatementPayment", () => {
  it("passes the session's workspace and parsed values to the service, ignoring any workspace in the form", async () => {
    expect(await registerStatementPayment(form({ ...valid, workspaceId: "w2", userId: "u2" }))).toEqual({ success: "Pagamento de R$ 1.000,00 registrado.", already: false });
    const [, actor, input] = mocks.apply.mock.calls[0];
    expect(actor).toMatchObject({ workspaceId: "w1", userId: "u1", role: "OWNER" });
    expect(input).toMatchObject({ statementId: "s1", version: "v1", mode: "PARTIAL", amountCents: 100_000, paidOn: "2032-10-05", unknownDate: false, confirmed: true, token: "token-1234567890abcdef" });
    expect(input.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("refuses anyone but the owner before reading anything else", async () => {
    mocks.permission.mockResolvedValue(session("MEMBER"));
    expect(await registerStatementPayment(form(valid))).toEqual({ error: "Somente o titular pode registrar pagamentos de fatura." });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a missing or unknown mode without touching the database", async () => {
    expect(await registerStatementPayment(form({ ...valid, mode: "ALL" }))).toEqual({ error: "Escolha o que aconteceu com a fatura." });
    expect(await registerStatementPayment(form({ ...valid, mode: "" }))).toHaveProperty("error");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("reads the checkboxes and an empty amount correctly", async () => {
    await registerStatementPayment(form({ ...valid, mode: "CARRY", amount: "", unknownDate: "on", nextStatementId: "s2", carryIncluded: "on", paidOn: "" }));
    expect(mocks.apply.mock.calls[0][2]).toMatchObject({ mode: "CARRY", amountCents: null, paidOn: null, unknownDate: true, nextStatementId: "s2", carryIncluded: true });
    await registerStatementPayment(form({ id: "s1", version: "v1", mode: "FULL", token: valid.token }));
    expect(mocks.apply.mock.calls[1][2]).toMatchObject({ confirmed: false, unknownDate: false });
  });

  it("surfaces a service rule as a readable error", async () => {
    mocks.apply.mockRejectedValue(new Error("Esta fatura já está paga."));
    expect(await registerStatementPayment(form(valid))).toEqual({ error: "Esta fatura já está paga." });
  });

  it("rejects an amount that is not money", async () => {
    expect(await registerStatementPayment(form({ ...valid, amount: "abc" }))).toHaveProperty("error");
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it("treats a simultaneous duplicate (unique fingerprint) as already registered, not as a failure", async () => {
    mocks.transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", meta: { target: ["workspaceId", "fingerprint"] }, clientVersion: "6" }));
    expect(await registerStatementPayment(form(valid))).toEqual({ success: "Este pagamento já estava registrado.", already: true });
  });
});

describe("undoManualStatementPayment", () => {
  it("is owner-only and passes the session workspace", async () => {
    expect(await undoManualStatementPayment(form({ id: "s1", version: "v1", confirm: "on", workspaceId: "w2" }))).toEqual({ success: "Pagamento desfeito." });
    expect(mocks.undo.mock.calls[0][1]).toMatchObject({ workspaceId: "w1" });
    expect(mocks.undo.mock.calls[0][2]).toEqual({ statementId: "s1", version: "v1", confirmed: true });
    mocks.permission.mockResolvedValue(session("VIEWER"));
    expect(await undoManualStatementPayment(form({ id: "s1", version: "v1", confirm: "on" }))).toEqual({ error: "Somente o titular pode desfazer pagamentos de fatura." });
  });
  it("shows the service's reason when it cannot undo", async () => {
    mocks.undo.mockRejectedValue(new Error("A fatura mudou depois do pagamento. Revise-a antes de desfazer."));
    expect(await undoManualStatementPayment(form({ id: "s1", version: "v1", confirm: "on" }))).toMatchObject({ error: expect.stringContaining("mudou depois") });
  });
});
