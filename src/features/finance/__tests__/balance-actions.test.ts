import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ permission: vi.fn(), account: vi.fn(), origin: vi.fn(), incoming: vi.fn(), create: vi.fn(), audit: vi.fn(), transaction: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/tenancy/requirePermission", () => ({ requirePermission: mocks.permission, AuthorizationError: class extends Error {} }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
import { reconcileAccountBalance } from "../actions";
const form = (balance: string) => { const fd = new FormData(); fd.set("id", "cash"); fd.set("balance", balance); return fd; };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.permission.mockResolvedValue({ workspaceId: "workspace", userId: "owner", workspace: { timezone: "America/Manaus" } });
  mocks.account.mockResolvedValue({ id: "cash", initialBalanceCents: 10000 });
  mocks.origin.mockResolvedValue([{ type: "INCOME", _sum: { amountCents: 5000 } }, { type: "EXPENSE", _sum: { amountCents: 2000 } }]);
  mocks.incoming.mockResolvedValue({ _sum: { amountCents: 3000 } });
  mocks.create.mockResolvedValue({ id: "adjustment" });
  mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({ account: { findFirst: mocks.account }, financeTransaction: { groupBy: mocks.origin, aggregate: mocks.incoming, create: mocks.create }, activityEvent: { create: mocks.audit } }));
});
describe("balance reconciliation", () => {
  it.each([["200,00", 4000], ["100,00", -6000], ["0", -16000], ["-10,00", -17000]])("records only the signed difference for %s", async (balance, delta) => {
    expect(await reconcileAccountBalance(form(balance))).toHaveProperty("success");
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({ accountId: "cash", workspaceId: "workspace", type: "ADJUSTMENT", amountCents: delta, source: "BALANCE_RECONCILIATION" });
    expect(mocks.transaction.mock.calls[0][1]).toEqual({ isolationLevel: "Serializable" });
  });
  it("is a no-op when the balance already matches", async () => {
    await reconcileAccountBalance(form("160,00"));
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("restricts the account to this workspace and excludes credit cards", async () => {
    mocks.account.mockResolvedValue(null);
    expect(await reconcileAccountBalance(form("10,00"))).toHaveProperty("error");
    expect(mocks.account.mock.calls[0][0].where).toMatchObject({ workspaceId: "workspace", isArchived: false, type: { in: ["CHECKING", "SAVINGS", "CASH", "DIGITAL_WALLET"] } });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("requires explicit balance including zero, and only totals posted dates", async () => {
    expect(await reconcileAccountBalance(form(""))).toHaveProperty("error");
    expect(mocks.transaction).not.toHaveBeenCalled();
    await reconcileAccountBalance(form("0"));
    expect(mocks.origin.mock.calls[0][0].where.date.lt).toBeInstanceOf(Date);
    expect(mocks.incoming.mock.calls[0][0].where.date).toEqual(mocks.origin.mock.calls[0][0].where.date);
  });
});
