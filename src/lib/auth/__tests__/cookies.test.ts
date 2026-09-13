import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findSession: vi.fn(), findMember: vi.fn(), cookie: vi.fn(), verify: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookie }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { userSession: { findUnique: mocks.findSession }, membership: { findUnique: mocks.findMember } } }));
vi.mock("../session", () => ({ verifySession: mocks.verify, SESSION_MAX_AGE: 604800 }));
import { getSessionFromCookies } from "../cookies";
describe("persistent session and membership enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookie.mockReturnValue({ value: "signed-token" });
    mocks.verify.mockResolvedValue({ userId: "u1", workspaceId: "w1", sessionId: "s1" });
    mocks.findSession.mockResolvedValue({ id: "s1", userId: "u1", workspaceId: "w1", status: "ACTIVE", expiresAt: new Date(Date.now() + 60000), user: { isActive: true }, workspace: { isActive: true } });
    mocks.findMember.mockResolvedValue({ isActive: true, role: "VIEWER" });
  });
  it("requires an active database session even for signed tokens", async () => {
    mocks.findSession.mockResolvedValue(null);
    expect(await getSessionFromCookies()).toBeNull();
  });
  it("fails closed when the session database is unavailable", async () => {
    mocks.findSession.mockRejectedValue(new Error("db unavailable"));
    await expect(getSessionFromCookies()).rejects.toThrow("db unavailable");
  });
  it.each(["REVOKED", "EXPIRED"])("rejects %s session", async (status) => {
    const session = await mocks.findSession();
    mocks.findSession.mockResolvedValue({ ...session, status });
    expect(await getSessionFromCookies()).toBeNull();
  });
  it("rejects membership revocation and queries the exact workspace-user pair", async () => {
    mocks.findMember.mockResolvedValue({ isActive: false });
    expect(await getSessionFromCookies()).toBeNull();
    expect(mocks.findMember).toHaveBeenCalledWith({ where: { workspaceId_userId: { workspaceId: "w1", userId: "u1" } } });
  });
  it("does not accept a session stored for a different workspace", async () => {
    const session = await mocks.findSession();
    mocks.findSession.mockResolvedValue({ ...session, workspaceId: "w2" });
    expect(await getSessionFromCookies()).toBeNull();
  });
  it("uses current membership role from the database", async () => {
    expect((await getSessionFromCookies())?.membership.role).toBe("VIEWER");
  });
});
