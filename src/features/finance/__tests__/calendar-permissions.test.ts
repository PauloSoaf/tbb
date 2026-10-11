import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ context: vi.fn(), catalog: vi.fn(), transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { permission: { findUnique: mocks.catalog }, $transaction: mocks.transaction } }));
vi.mock("@/lib/tenancy/getCurrentTenantContext", () => ({ getWorkspaceContext: mocks.context }));
vi.mock("@/lib/workspace", async () => await import("@/lib/tenancy/requirePermission"));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { financeCalendarCanWrite } from "../calendar-query";
import { saveTransaction } from "../actions";
import { AuthorizationError } from "@/lib/tenancy/requirePermission";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.context.mockResolvedValue({ workspaceId: "synthetic", membershipId: "member", role: "VIEWER" });
  mocks.catalog.mockResolvedValue({ rolePermissions: [], overrides: [] });
});
describe("effective calendar WRITE permission", () => {
  it("hides creation for a read-only viewer and rejects a forged save on the server", async () => {
    expect(await financeCalendarCanWrite()).toBe(false);
    await expect(saveTransaction(new FormData())).rejects.toBeInstanceOf(AuthorizationError);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.catalog.mock.calls[0][0]).toMatchObject({ where: { key: "WRITE" }, include: {
      rolePermissions: { where: { workspaceId: "synthetic", role: "VIEWER" } },
      overrides: { where: { membershipId: "member" } },
    } });
  });
  it("honors an ALLOW membership override for a viewer", async () => {
    mocks.catalog.mockResolvedValue({ rolePermissions: [], overrides: [{ effect: "ALLOW" }] });
    expect(await financeCalendarCanWrite()).toBe(true);
  });
  it("honors a DENY override for a member who otherwise has WRITE", async () => {
    mocks.context.mockResolvedValue({ workspaceId: "synthetic", membershipId: "member", role: "MEMBER" });
    mocks.catalog.mockResolvedValue({ rolePermissions: [{ enabled: true }], overrides: [{ effect: "DENY" }] });
    expect(await financeCalendarCanWrite()).toBe(false);
    await expect(saveTransaction(new FormData())).rejects.toBeInstanceOf(AuthorizationError);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("honors the workspace role override and the owner's existing policy", async () => {
    mocks.catalog.mockResolvedValue({ rolePermissions: [{ enabled: true }], overrides: [] });
    expect(await financeCalendarCanWrite()).toBe(true);
    mocks.context.mockResolvedValue({ role: "OWNER" });
    mocks.catalog.mockClear();
    expect(await financeCalendarCanWrite()).toBe(true);
    expect(mocks.catalog).not.toHaveBeenCalled();
  });
  it("does not disguise infrastructure failures as a permission denial", async () => {
    mocks.catalog.mockRejectedValue(new Error("Synthetic connection failure"));
    await expect(financeCalendarCanWrite()).rejects.toThrow("Synthetic connection failure");
  });
});
