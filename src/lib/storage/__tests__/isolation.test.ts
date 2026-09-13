import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), remove: vi.fn(), read: vi.fn(), deleteMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { storageFile: { findFirst: mocks.findFirst, deleteMany: mocks.deleteMany } } }));
vi.mock("@/lib/storage", () => ({ storage: { readFile: mocks.read, deleteFile: mocks.remove } }));
vi.mock("@/lib/workspace", () => ({ requirePermission: async () => ({ workspaceId: "w1", userId: "u1" }), AuthorizationError: class extends Error {} }));
vi.mock("@/lib/billing/subscription-context", () => ({ getWorkspaceSubscriptionContext: vi.fn() }));
import { readTrackedFile, deleteTrackedFile } from "../tracked-upload";
describe("private file tenant isolation", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.findFirst.mockResolvedValue(null); });
  it("denies downloads from another workspace before touching the provider", async () => {
    await expect(readTrackedFile("foreign-file")).rejects.toThrow("Arquivo não encontrado");
    expect(mocks.findFirst).toHaveBeenCalledWith({ where: { id: "foreign-file", workspaceId: "w1" } });
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it("requires ledger ownership before deleting any storage object", async () => {
    await expect(deleteTrackedFile("foreign-file")).rejects.toThrow("Arquivo não encontrado");
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
});
