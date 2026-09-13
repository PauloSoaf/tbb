import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ updateMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { userSession: { updateMany: mocks.updateMany } } }));
vi.mock("@/lib/workspace", () => ({ getWorkspaceContext: async () => ({ workspaceId: "w1", userId: "u1" }) }));
import { sessionService } from "../session.service";
describe("session revocation isolation", () => {
  it("constrains revocation to both workspace and current user", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    await expect(sessionService.revokeSession("session-other-user")).rejects.toThrow("Sessão não encontrada");
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: "session-other-user", workspaceId: "w1", userId: "u1", status: "ACTIVE" }, data: { status: "REVOKED", revokedAt: expect.any(Date) } });
  });
});
