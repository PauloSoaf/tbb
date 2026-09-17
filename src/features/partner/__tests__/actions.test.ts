import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  getActivePartnerConnection: vi.fn(),
  allowAttempt: vi.fn(),
  connectionFindUnique: vi.fn(),
  connectionUpdate: vi.fn(),
  policyUpdate: vi.fn(),
  tx: {
    partnerConnection: { update: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    partnerSharingPolicy: { createMany: vi.fn(), update: vi.fn() },
    activityEvent: { create: vi.fn() },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/actions/auth", () => ({ allowAttempt: mocks.allowAttempt }));
vi.mock("@/lib/tenancy/requirePermission", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/lib/tenancy/partnerAccess", () => ({ getActivePartnerConnection: mocks.getActivePartnerConnection }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    partnerConnection: { findUnique: mocks.connectionFindUnique, update: mocks.connectionUpdate },
    partnerSharingPolicy: { update: mocks.policyUpdate },
    $transaction: (fn: (tx: typeof mocks.tx) => unknown) => fn(mocks.tx),
  },
}));

import { acceptPartnerInvite, updatePartnerSharingPolicy } from "../actions";

describe("partner actions — IDOR and precondition guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue({ workspaceId: "w1", userId: "u1" });
  });

  it("refuses to let a workspace accept its own invite", async () => {
    mocks.connectionFindUnique.mockResolvedValue({
      id: "conn1", requesterWorkspaceId: "w1", status: "PENDING", inviteExpiresAt: new Date(Date.now() + 1000),
    });
    const result = await acceptPartnerInvite("some-token");
    expect(result).toEqual({ error: "Você não pode aceitar seu próprio convite." });
    expect(mocks.tx.partnerConnection.update).not.toHaveBeenCalled();
  });

  it("refuses an expired invite token", async () => {
    mocks.connectionFindUnique.mockResolvedValue({
      id: "conn1", requesterWorkspaceId: "w2", status: "PENDING", inviteExpiresAt: new Date(Date.now() - 1000),
    });
    const result = await acceptPartnerInvite("expired-token");
    expect(result).toEqual({ error: "Este convite não é mais válido." });
    expect(mocks.tx.partnerConnection.update).not.toHaveBeenCalled();
  });

  it("refuses a token that was already used (no longer PENDING)", async () => {
    mocks.connectionFindUnique.mockResolvedValue({
      id: "conn1", requesterWorkspaceId: "w2", status: "ACCEPTED", inviteExpiresAt: new Date(Date.now() + 1000),
    });
    const result = await acceptPartnerInvite("used-token");
    expect(result).toEqual({ error: "Este convite não é mais válido." });
  });

  it("refuses an unknown token without leaking whether it ever existed", async () => {
    mocks.connectionFindUnique.mockResolvedValue(null);
    const result = await acceptPartnerInvite("nonexistent-token");
    expect(result).toEqual({ error: "Este convite não é mais válido." });
  });

  it("updatePartnerSharingPolicy can only ever target the caller's own workspace as owner", async () => {
    mocks.getActivePartnerConnection.mockResolvedValue({ id: "conn1", requesterWorkspaceId: "w1", receiverWorkspaceId: "w2", status: "ACCEPTED" });
    await updatePartnerSharingPolicy("finance", false);
    expect(mocks.tx.partnerSharingPolicy.update).toHaveBeenCalledWith({
      where: { connectionId_ownerWorkspaceId_module: { connectionId: "conn1", ownerWorkspaceId: "w1", module: "finance" } },
      data: { enabled: false },
    });
  });

  it("rejects an unknown module name before touching the database", async () => {
    const result = await updatePartnerSharingPolicy("not-a-real-module", true);
    expect(result).toEqual({ error: "Módulo inválido." });
    expect(mocks.getActivePartnerConnection).not.toHaveBeenCalled();
  });
});
