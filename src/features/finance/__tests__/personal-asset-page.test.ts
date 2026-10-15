import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ permission: vi.fn(), rows: vi.fn().mockResolvedValue([]), debts: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/workspace", () => ({ requirePermission: mocks.permission, AuthorizationError: class extends Error {} }));
vi.mock("@/lib/prisma", () => ({ prisma: { debt: { findMany: mocks.debts } } }));
vi.mock("../personal-asset-query", () => ({ personalAssetRows: mocks.rows }));
vi.mock("../PersonalAssetsPage", () => ({ PersonalAssetsPage: () => null }));
import { AuthorizationError } from "@/lib/workspace";
import AssetsPage from "@/app/(app)/finance/assets/page";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.permission.mockResolvedValue({ workspaceId: "own", workspace: { timezone: "UTC" } });
});
describe("asset page permission boundaries", () => {
  it("requires READ before querying any asset or financing", async () => {
    mocks.permission.mockRejectedValue(new AuthorizationError());
    await expect(AssetsPage()).rejects.toThrow();
    expect(mocks.rows).not.toHaveBeenCalled(); expect(mocks.debts).not.toHaveBeenCalled();
  });
  it("hides write controls when the effective WRITE permission is denied", async () => {
    mocks.permission.mockImplementation(async permission => {
      if (permission === "WRITE") throw new AuthorizationError();
      return { workspaceId: "own", workspace: { timezone: "UTC" } };
    });
    expect((await AssetsPage()).props.children.props.canWrite).toBe(false);
    expect(mocks.rows).toHaveBeenCalledWith("own", true);
    expect(mocks.debts.mock.calls[0][0].where).toEqual({ workspaceId: "own" });
  });
  it("shows write controls only after effective WRITE authorization", async () => {
    expect((await AssetsPage()).props.children.props.canWrite).toBe(true);
    expect(mocks.permission.mock.calls.map(([permission]) => permission)).toEqual(["READ", "WRITE"]);
  });
  it("does not hide unrelated permission infrastructure failures", async () => {
    mocks.permission.mockResolvedValueOnce({ workspaceId: "own", workspace: { timezone: "UTC" } }).mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(AssetsPage()).rejects.toThrow("Database unavailable");
    expect(mocks.rows).not.toHaveBeenCalled();
  });
});
