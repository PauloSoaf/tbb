import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getWorkspaceContext: vi.fn(),
  connectionFindFirst: vi.fn(),
  connectionFindUnique: vi.fn(),
  policyFindUnique: vi.fn(),
}));
vi.mock("@/lib/tenancy/getCurrentTenantContext", () => ({ getWorkspaceContext: mocks.getWorkspaceContext }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    partnerConnection: { findFirst: mocks.connectionFindFirst, findUnique: mocks.connectionFindUnique },
    partnerSharingPolicy: { findUnique: mocks.policyFindUnique },
  },
}));

import { getPartnerContext, requirePartnerContext, getActivePartnerConnection } from "../partnerAccess";

const ACCEPTED_CONNECTION = { id: "conn1", requesterWorkspaceId: "w1", receiverWorkspaceId: "w2", status: "ACCEPTED" };

describe("partner access boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getWorkspaceContext.mockResolvedValue({ workspaceId: "w1", userId: "u1" });
  });

  it("denies access when no connection exists", async () => {
    mocks.connectionFindFirst.mockResolvedValue(null);
    await expect(getPartnerContext("finance")).resolves.toBeNull();
    await expect(requirePartnerContext("finance")).rejects.toThrow();
    expect(mocks.policyFindUnique).not.toHaveBeenCalled();
  });

  it("only ever queries ACCEPTED connections — a revoked/pending one is invisible to this helper", async () => {
    mocks.connectionFindFirst.mockResolvedValue(null);
    await getActivePartnerConnection("w1");
    expect(mocks.connectionFindFirst).toHaveBeenCalledWith({ where: { status: "ACCEPTED", OR: [{ requesterWorkspaceId: "w1" }, { receiverWorkspaceId: "w1" }] } });
  });

  it("grants access once connected and the partner enabled the module", async () => {
    mocks.connectionFindFirst.mockResolvedValue(ACCEPTED_CONNECTION);
    mocks.policyFindUnique.mockResolvedValue({ enabled: true });
    const result = await requirePartnerContext("finance");
    expect(result.partnerWorkspaceId).toBe("w2");
    expect(mocks.policyFindUnique).toHaveBeenCalledWith({
      where: { connectionId_ownerWorkspaceId_module: { connectionId: "conn1", ownerWorkspaceId: "w2", module: "finance" } },
    });
  });

  it("applies the same owner policy boundary to the investments module", async () => {
    mocks.connectionFindFirst.mockResolvedValue(ACCEPTED_CONNECTION);
    mocks.policyFindUnique.mockResolvedValue({ enabled: true });
    const result = await requirePartnerContext("investments");
    expect(result.partnerWorkspaceId).toBe("w2");
    expect(mocks.policyFindUnique).toHaveBeenCalledWith({
      where: { connectionId_ownerWorkspaceId_module: { connectionId: "conn1", ownerWorkspaceId: "w2", module: "investments" } },
    });
  });

  it("denies access when the partner (not me) has disabled the module", async () => {
    mocks.connectionFindFirst.mockResolvedValue(ACCEPTED_CONNECTION);
    mocks.policyFindUnique.mockResolvedValue({ enabled: false });
    await expect(getPartnerContext("finance")).resolves.toBeNull();
  });

  it("denies access when no sharing policy row exists at all", async () => {
    mocks.connectionFindFirst.mockResolvedValue(ACCEPTED_CONNECTION);
    mocks.policyFindUnique.mockResolvedValue(null);
    await expect(getPartnerContext("finance")).resolves.toBeNull();
  });

  it("resolves the correct partner workspace id from either side of the connection", async () => {
    mocks.getWorkspaceContext.mockResolvedValue({ workspaceId: "w2", userId: "u2" });
    mocks.connectionFindFirst.mockResolvedValue(ACCEPTED_CONNECTION);
    mocks.policyFindUnique.mockResolvedValue({ enabled: true });
    const result = await requirePartnerContext("finance");
    expect(result.partnerWorkspaceId).toBe("w1");
    expect(mocks.policyFindUnique).toHaveBeenCalledWith({
      where: { connectionId_ownerWorkspaceId_module: { connectionId: "conn1", ownerWorkspaceId: "w1", module: "finance" } },
    });
  });
});
