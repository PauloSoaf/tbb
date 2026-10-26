import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ permission: vi.fn(), shared: vi.fn(), sync: vi.fn(), connections: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { openFinanceConnection: { findMany: mocks.connections } } }));
vi.mock("@/lib/workspace", () => ({ requirePermission: mocks.permission }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("../setup", () => ({ syncEverything: mocks.sync }));
vi.mock("../connections", () => ({}));
vi.mock("../sync", () => ({}));
vi.mock("../credit-bills", () => ({}));
vi.mock("../pluggy-client", async importOriginal => ({ ...await importOriginal<typeof import("../pluggy-client")>(), sharedPluggyClient: mocks.shared }));
import { syncAllOpenFinanceConnections, syncOpenFinanceNow } from "../actions";
import { PluggyError } from "../pluggy-client";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.permission.mockResolvedValue({ workspaceId: "synthetic", role: "OWNER" });
  mocks.shared.mockReturnValue({});
  mocks.connections.mockResolvedValue([{ id: "synthetic-a" }, { id: "synthetic-b" }]);
});

describe("synchronization feedback", () => {
  it("does not announce success when every bank times out", async () => {
    mocks.sync.mockRejectedValue(new PluggyError("NETWORK_TIMEOUT"));
    const result = await syncAllOpenFinanceConnections();
    expect(result).toEqual({ error: expect.stringContaining("Nenhum banco concluiu") });
    expect(result).not.toHaveProperty("success");
  });

  it("distinguishes partial success from a fully completed import", async () => {
    mocks.sync.mockResolvedValueOnce({ status: "SUCCESS", autoCreated: 2, needsReview: 0, unresolved: 0 }).mockRejectedValueOnce(new PluggyError("NETWORK_TIMEOUT"));
    expect(await syncAllOpenFinanceConnections()).toEqual({ success: expect.stringContaining("Sincronização parcial: 2 lançamento(s) novo(s)") });
  });

  it("refreshes failure metadata when a manual attempt times out", async () => {
    mocks.sync.mockRejectedValue(new PluggyError("NETWORK_TIMEOUT"));
    const fields = new FormData(); fields.set("connectionId", "synthetic-a");
    expect(await syncOpenFinanceNow(fields)).toEqual({ error: expect.stringContaining("não respondeu a tempo") });
    expect(mocks.revalidate).toHaveBeenCalledWith("/integrations/open-finance");
  });

  it("does not query connections or synchronize for a non-owner", async () => {
    mocks.permission.mockResolvedValue({ workspaceId: "synthetic", role: "MEMBER" });
    expect(await syncAllOpenFinanceConnections()).toHaveProperty("error");
    expect(mocks.connections).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
  });
});
