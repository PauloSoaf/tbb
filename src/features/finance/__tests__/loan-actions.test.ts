import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ permission: vi.fn(), transaction: vi.fn(), create: vi.fn(), updateMany: vi.fn(), count: vi.fn(), deleteMany: vi.fn(), audit: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/workspace", () => ({ requirePermission: mocks.permission }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction, loanComparison: { deleteMany: mocks.deleteMany } } }));

import { deleteLoanComparison, saveLoanComparison } from "../loan-actions";
import { emptyForm, scenarioFromForm } from "../loan-comparison";

const scenario = scenarioFromForm(emptyForm("s1", "2032-01-10", { name: "Parcelar", rate: "2", installments: "12" })).input;
const payload = { version: 1, neededCents: 500_000, flow: { incomeCents: 550_000, commitmentsCents: 200_000, incomeChangePercent: 0, extraExpenseCents: 0 }, scenarios: [scenario] };
const form = (entries: Record<string, string>) => { const fd = new FormData(); Object.entries(entries).forEach(([key, value]) => fd.set(key, value)); return fd; };
const valid = { name: "Fatura de novembro", payload: JSON.stringify(payload) };
const session = (role = "OWNER") => ({ workspaceId: "w1", userId: "u1", role });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.permission.mockResolvedValue(session());
  mocks.count.mockResolvedValue(0);
  mocks.updateMany.mockResolvedValue({ count: 1 });
  mocks.deleteMany.mockResolvedValue({ count: 1 });
  mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({ loanComparison: { create: mocks.create, updateMany: mocks.updateMany, count: mocks.count }, activityEvent: { create: mocks.audit } }));
});

describe("F06 · saving a comparison", () => {
  it("stores only the inputs, in the session's workspace, and says that no debt was created", async () => {
    const result = await saveLoanComparison(form({ ...valid, workspaceId: "w2" }));
    expect(result).toEqual({ success: "Comparação salva. Nada foi criado em dívidas ou faturas." });
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({ workspaceId: "w1", name: "Fatura de novembro", createdByUserId: "u1", version: 1 });
    expect(mocks.create.mock.calls[0][0].data.payload.scenarios[0]).not.toHaveProperty("schedule");
    expect(mocks.audit).toHaveBeenCalledTimes(1);
  });
  it("is owner-only and never touches the database for anyone else", async () => {
    mocks.permission.mockResolvedValue(session("MEMBER"));
    expect(await saveLoanComparison(form(valid))).toEqual({ error: "Somente o titular pode salvar comparações de crédito." });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("rejects a missing name, broken JSON and an invalid payload", async () => {
    expect(await saveLoanComparison(form({ ...valid, name: "  " }))).toEqual({ error: "Dê um nome à comparação." });
    expect(await saveLoanComparison(form({ ...valid, payload: "{not json" }))).toEqual({ error: "Os dados da comparação são inválidos." });
    expect(await saveLoanComparison(form({ ...valid, payload: JSON.stringify({ ...payload, neededCents: -5 }) }))).toHaveProperty("error");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("updates only a comparison of the same workspace, and refuses an unknown id", async () => {
    await saveLoanComparison(form({ ...valid, id: "c1" }));
    expect(mocks.updateMany.mock.calls[0][0].where).toEqual({ id: "c1", workspaceId: "w1" });
    mocks.updateMany.mockResolvedValue({ count: 0 });
    expect(await saveLoanComparison(form({ ...valid, id: "someone-elses" }))).toEqual({ error: "Comparação não encontrada neste espaço." });
  });
  it("caps how many can be kept", async () => {
    mocks.count.mockResolvedValue(30);
    expect(await saveLoanComparison(form(valid))).toMatchObject({ error: expect.stringContaining("30 comparações") });
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe("F06 · deleting a comparison", () => {
  it("deletes only inside the session's workspace", async () => {
    expect(await deleteLoanComparison(form({ id: "c1", workspaceId: "w2" }))).toEqual({ success: "Comparação excluída." });
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: "c1", workspaceId: "w1" } });
  });
  it("is owner-only and reports an unknown id", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 0 });
    expect(await deleteLoanComparison(form({ id: "nope" }))).toEqual({ error: "Comparação não encontrada neste espaço." });
    mocks.permission.mockResolvedValue(session("VIEWER"));
    expect(await deleteLoanComparison(form({ id: "c1" }))).toEqual({ error: "Somente o titular pode excluir comparações." });
  });
});
