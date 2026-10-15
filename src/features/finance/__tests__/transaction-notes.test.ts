import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  permission: vi.fn(), accountCount: vi.fn(), categoryCount: vi.fn(), transaction: vi.fn(),
  findMany: vi.fn(), update: vi.fn(), create: vi.fn(), audit: vi.fn(), cellFindFirst: vi.fn(), cellUpdateMany: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/tenancy/requirePermission", () => ({ requirePermission: mocks.permission, AuthorizationError: class AuthorizationError extends Error {} }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  $transaction: mocks.transaction,
  account: { count: mocks.accountCount },
  financeCategory: { count: mocks.categoryCount },
  financeTransaction: { findFirst: mocks.cellFindFirst, updateMany: mocks.cellUpdateMany },
} }));

import { saveGridTransactions, updateTransactionCell } from "../actions";
import { transactionFingerprint } from "../import-engine";
import { NOTE_MAX, hasNote, normalizeNote, notePreview } from "../transaction-notes";
import { transactionWhere } from "../transaction-filters";

const ctx = { workspaceId: "w1", userId: "u1", role: "OWNER", workspace: { timezone: "America/Manaus" } };
const base = { date: "2032-03-10", description: "Almoço", amount: "35,00", type: "EXPENSE" as const, accountId: "acc", categoryId: "cat" };
const savedRow = { id: "tx1", accountId: "acc", type: "EXPENSE", amountCents: 3500, cardStatementId: null, statementDetailMode: null };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.permission.mockResolvedValue(ctx);
  mocks.accountCount.mockResolvedValue(1);
  mocks.categoryCount.mockResolvedValue(1);
  mocks.findMany.mockImplementation(async ({ where }: { where: { id?: { in?: string[] } } }) => (where.id?.in ?? []).includes(savedRow.id) ? [savedRow] : []);
  mocks.update.mockResolvedValue({});
  mocks.create.mockResolvedValue({});
  mocks.cellFindFirst.mockResolvedValue(savedRow);
  mocks.cellUpdateMany.mockResolvedValue({ count: 1 });
  mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({
    financeTransaction: { findMany: mocks.findMany, update: mocks.update, create: mocks.create, findFirst: mocks.cellFindFirst, updateMany: mocks.cellUpdateMany },
    activityEvent: { create: mocks.audit },
  }));
});

describe("F02 · note rules", () => {
  it("keeps text, accents, emoji and line breaks, with LF endings", () => {
    expect(normalizeNote("  Dividido com Alexandre ☕\r\nPix na sexta\r\n")).toBe("Dividido com Alexandre ☕\nPix na sexta");
  });
  it("treats empty or blank notes as no note, and removes control characters", () => {
    expect(normalizeNote("")).toBeNull();
    expect(normalizeNote("   \n  ")).toBeNull();
    expect(normalizeNote(undefined)).toBeNull();
    expect(normalizeNote("a\u0000b\u0007c")).toBe("abc");
  });
  it("caps a note at 2.000 characters", () => {
    expect(normalizeNote("x".repeat(NOTE_MAX + 50))).toHaveLength(NOTE_MAX);
  });
  it("makes a one-line preview without cutting words badly", () => {
    expect(notePreview("linha 1\n\nlinha   2", 60)).toBe("linha 1 linha 2");
    expect(notePreview("a".repeat(100), 20)).toHaveLength(20);
    expect(notePreview("a".repeat(100), 20).endsWith("…")).toBe(true);
    expect(hasNote("  ")).toBe(false);
    expect(hasNote("ok")).toBe(true);
  });
  it("does not take part in the transaction fingerprint, so editing it never duplicates a row", () => {
    const args = { date: "2032-03-10", description: "Almoço", amountCents: 3500, type: "EXPENSE" as const, externalId: null };
    expect(transactionFingerprint("w1", "acc", args)).toBe(transactionFingerprint("w1", "acc", { ...args, notes: "dividido" } as typeof args));
  });
});

describe("F02 · saving the note from the grid", () => {
  it("creates a transaction with its note, normalized", async () => {
    expect(await saveGridTransactions([{ ...base, id: "draft-1", notes: "  dividido com Alexandre \r\n" }])).toEqual({ success: "1 lançamento(s) salvo(s)." });
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({ workspaceId: "w1", description: "Almoço", notes: "dividido com Alexandre" });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("creates a transaction without a note when none was typed, never an empty string", async () => {
    await saveGridTransactions([{ ...base, id: "draft-1", notes: "" }]);
    expect(mocks.create.mock.calls[0][0].data.notes).toBeNull();
  });

  it("updates only the note when only the note changed: value, date, account and category stay as sent", async () => {
    await saveGridTransactions([{ ...base, id: "tx1", notes: "dividido com Alexandre" }]);
    const data = mocks.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ notes: "dividido com Alexandre", amountCents: 3500, accountId: "acc", categoryId: "cat", description: "Almoço", revision: { increment: 1 } });
    expect(mocks.update.mock.calls[0][0].where).toEqual({ id: "tx1", workspaceId: "w1" });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("clears a stored note when the user empties it", async () => {
    await saveGridTransactions([{ ...base, id: "tx1", notes: "" }]);
    expect(mocks.update.mock.calls[0][0].data.notes).toBeNull();
  });

  it("leaves a stored note untouched when an older client does not send the field", async () => {
    await saveGridTransactions([{ ...base, id: "tx1" }]);
    expect(mocks.update.mock.calls[0][0].data.notes).toBeUndefined();
  });

  it("rejects a note above 2.000 characters before touching the database", async () => {
    const result = await saveGridTransactions([{ ...base, id: "draft-1", notes: "x".repeat(NOTE_MAX + 1) }]);
    expect(result).toHaveProperty("error");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("only edits rows of the session workspace, whatever the client says", async () => {
    mocks.findMany.mockResolvedValue([]);
    const result = await saveGridTransactions([{ ...base, id: "someone-elses", notes: "x" }]);
    expect(result).toEqual({ error: "Uma transação editada não está disponível neste workspace." });
    expect(mocks.findMany.mock.calls[0][0].where).toMatchObject({ workspaceId: "w1", id: { in: ["someone-elses"] } });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("edits a single cell note without touching any other field", async () => {
    expect(await updateTransactionCell({ id: "tx1", field: "notes", value: "  dividido  " })).toHaveProperty("success");
    expect(mocks.cellUpdateMany.mock.calls[0][0]).toEqual({ where: { id: "tx1", workspaceId: "w1" }, data: { notes: "dividido", revision: { increment: 1 } } });
    await updateTransactionCell({ id: "tx1", field: "notes", value: "" });
    expect(mocks.cellUpdateMany.mock.calls[1][0].data.notes).toBeNull();
  });
});

describe("F02 · the text search reaches the note", () => {
  it("searches description, merchant, note and tags, always inside the workspace", () => {
    const where = transactionWhere("w1", { q: "  Alexandre " });
    expect(where.workspaceId).toBe("w1");
    expect(where.OR).toEqual([
      { description: { contains: "Alexandre", mode: "insensitive" } },
      { merchant: { contains: "Alexandre", mode: "insensitive" } },
      { notes: { contains: "Alexandre", mode: "insensitive" } },
      { tags: { has: "Alexandre" } },
    ]);
  });
  it("adds no text clause for an empty search, and ignores an unknown type", () => {
    expect(transactionWhere("w1", { q: "   " }).OR).toBeUndefined();
    expect(transactionWhere("w1", { type: "DROP" }).type).toBeUndefined();
    expect(transactionWhere("w1", { type: "INCOME", account: "a1" })).toMatchObject({ type: "INCOME", accountId: "a1" });
  });
});
