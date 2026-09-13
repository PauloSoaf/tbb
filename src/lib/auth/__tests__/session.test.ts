import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { createSession, verifySession } from "../session";
describe("TBB session signatures", () => {
  beforeEach(() => { vi.stubEnv("JWT_SECRET", "tbb-test-secret-at-least-thirty-two-characters"); });
  it("signs unique session identities and validates the TBB audience", async () => {
    const first = await createSession({ userId: "u1", workspaceId: "w1" });
    const second = await createSession({ userId: "u1", workspaceId: "w1" });
    expect(first).not.toBe(second);
    expect(await verifySession(first)).toMatchObject({ userId: "u1", workspaceId: "w1" });
  });
  it("rejects tokens from the source product and malformed claims", async () => {
    const key = new TextEncoder().encode(process.env.JWT_SECRET);
    const original = await new SignJWT({ userId: "u1", workspaceId: "w1" }).setProtectedHeader({ alg: "HS256" }).setIssuer("nutriopus").setAudience("nutriopus-app").setJti("session").setExpirationTime("7d").sign(key);
    const malformed = await new SignJWT({ userId: "u1" }).setProtectedHeader({ alg: "HS256" }).setIssuer("tbb").setAudience("tbb-app").setJti("session").setExpirationTime("7d").sign(key);
    expect(await verifySession(original)).toBeNull();
    expect(await verifySession(malformed)).toBeNull();
  });
  it("refuses to create a session without a strong configured secret", async () => {
    vi.stubEnv("JWT_SECRET", "short");
    await expect(createSession({ userId: "u1", workspaceId: "w1" })).rejects.toThrow("JWT_SECRET");
  });
});
