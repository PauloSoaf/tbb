import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { personalAsset: { findMany: mocks.find } } }));
import { personalAssetRows } from "../personal-asset-query";
const row = { id: "asset", name: "Synthetic item", kind: "ELECTRONIC", valueCents: 123, valuationDate: new Date("2032-01-10"), purchaseValueCents: null, purchaseDate: null, notes: null, debtId: "loan", debt: { workspaceId: "own", name: "Synthetic loan", remainingBalanceCents: 100, status: "ACTIVE" }, archivedAt: null, version: 1 };
beforeEach(() => { vi.clearAllMocks(); mocks.find.mockResolvedValue([row]); });
describe("workspace asset reads", () => {
  it("returns serializable active valuations scoped to one workspace", async () => {
    expect(await personalAssetRows("own")).toEqual([expect.objectContaining({ valuationDate: "2032-01-10", debt: { name: "Synthetic loan", remainingBalanceCents: 100, status: "ACTIVE" } })]);
    expect(mocks.find.mock.calls[0][0].where).toEqual({ workspaceId: "own", archivedAt: null });
  });
  it("includes archives only when asked, still scoped to the workspace", async () => {
    await personalAssetRows("own", true);
    expect(mocks.find.mock.calls[0][0].where).toEqual({ workspaceId: "own" });
  });
  it("does not expose a debt from another workspace even if a malformed relation exists", async () => {
    mocks.find.mockResolvedValue([{ ...row, debt: { ...row.debt, workspaceId: "foreign" } }]);
    expect((await personalAssetRows("own"))[0]).toMatchObject({ debt: null, debtId: null });
  });
});
