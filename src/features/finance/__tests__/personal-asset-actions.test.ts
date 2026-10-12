import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ permission: vi.fn(), transaction: vi.fn(), create: vi.fn(), update: vi.fn(), debt: vi.fn(), audit: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/lib/workspace", () => ({ requirePermission: mocks.permission }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.invalidate }));
import { savePersonalAsset, setPersonalAssetArchived } from "../personal-asset-actions";

function form(fields: Record<string, string> = {}) {
  const fd = new FormData();
  for (const [key, value] of Object.entries({ name: "Synthetic item", kind: "ELECTRONIC", value: "100,01", valuationDate: "2030-01-01", ...fields })) fd.set(key, value);
  return fd;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers(); vi.setSystemTime(new Date("2032-01-10T12:00:00Z"));
  mocks.permission.mockResolvedValue({ workspaceId: "own", userId: "user", workspace: { timezone: "UTC" } });
  mocks.create.mockResolvedValue({ id: "asset" }); mocks.update.mockResolvedValue({ count: 1 }); mocks.debt.mockResolvedValue({ id: "loan" });
  mocks.transaction.mockImplementation(async fn => fn({ personalAsset: { create: mocks.create, updateMany: mocks.update }, debt: { findFirst: mocks.debt }, activityEvent: { create: mocks.audit } }));
});
afterEach(() => vi.useRealTimers());
describe("asset persistence and authorization", () => {
  it("creates only an asset and audit in the session workspace", async () => {
    expect(await savePersonalAsset(form({ workspaceId: "foreign" }))).toHaveProperty("success");
    expect(mocks.permission).toHaveBeenCalledWith("WRITE");
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({ workspaceId: "own", valueCents: 10001 });
    expect(mocks.audit.mock.calls[0][0].data).toMatchObject({ workspaceId: "own", actorUserId: "user", entityType: "PersonalAsset", entityId: "asset" });
    expect(mocks.invalidate).toHaveBeenCalledWith("/finance", "layout");
  });
  it("checks linked debt ownership inside the transaction and does not mutate that debt", async () => {
    expect(await savePersonalAsset(form({ debtId: "loan" }))).toHaveProperty("success");
    expect(mocks.debt.mock.calls[0][0].where).toEqual({ id: "loan", workspaceId: "own" });
    mocks.debt.mockResolvedValue(null);
    const created = mocks.create.mock.calls.length;
    expect(await savePersonalAsset(form({ debtId: "foreign" }))).toHaveProperty("error");
    expect(mocks.create).toHaveBeenCalledTimes(created);
  });
  it("scopes edits and uses an optimistic version to prevent stale valuations", async () => {
    expect(await savePersonalAsset(form({ id: "asset", version: "3", workspaceId: "foreign" }))).toHaveProperty("success");
    expect(mocks.update.mock.calls[0][0]).toMatchObject({ where: { id: "asset", workspaceId: "own", version: 3, archivedAt: null }, data: { version: { increment: 1 } } });
    mocks.update.mockResolvedValue({ count: 0 });
    expect(await savePersonalAsset(form({ id: "asset", version: "3" }))).toHaveProperty("error");
    expect(mocks.audit).toHaveBeenCalledTimes(1);
  });
  it.each(["", "0", "-1", "1.5", "NaN"])("rejects invalid edit versions: %s", async version => {
    expect(await savePersonalAsset(form({ id: "asset", version }))).toHaveProperty("error");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it.each(["ARCHIVE", "RESTORE"])("scopes %s to the session workspace and preserves the financing", async operation => {
    expect(await setPersonalAssetArchived(form({ id: "asset", version: "2", operation, workspaceId: "foreign" }))).toHaveProperty("success");
    expect(mocks.update.mock.calls[0][0].where).toMatchObject({ id: "asset", workspaceId: "own", version: 2 });
    expect(mocks.update.mock.calls[0][0].data).toEqual({ archivedAt: operation === "ARCHIVE" ? expect.any(Date) : null, version: { increment: 1 } });
    expect(mocks.debt).not.toHaveBeenCalled();
  });
  it("rejects a missing or stale archive and invalid operations without a success audit", async () => {
    mocks.update.mockResolvedValue({ count: 0 });
    expect(await setPersonalAssetArchived(form({ id: "foreign", version: "1", operation: "ARCHIVE" }))).toHaveProperty("error");
    expect(await setPersonalAssetArchived(form({ id: "asset", version: "1", operation: "DELETE" }))).toHaveProperty("error");
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("requires effective WRITE permission before any parsing or database access", async () => {
    mocks.permission.mockRejectedValue(new Error("Denied"));
    await expect(savePersonalAsset(form())).rejects.toThrow("Denied");
    await expect(setPersonalAssetArchived(form())).rejects.toThrow("Denied");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
