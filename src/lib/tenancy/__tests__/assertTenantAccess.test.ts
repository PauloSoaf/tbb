import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentTenantContext: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("react", () => ({
  cache: <T,>(fn: T) => fn,
}));

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth/cookies", () => ({
  getSessionFromCookies: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/tenancy/getCurrentTenantContext", () => ({
  getCurrentTenantContext: mocks.getCurrentTenantContext,
}));

import { assertTenantAccess } from "../assertTenantAccess";

describe("assertTenantAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((href: string) => {
      throw new Error(`NEXT_REDIRECT:${href}`);
    });
  });

  it("allows a global admin through a narrower team-role allowlist", async () => {
    const context = {
      session: { role: "GLOBAL_ADMIN" },
      nutritionist: { id: "nutritionist_1" },
      permissions: new Set<string>(),
      isGlobalAdmin: true,
      isOwner: false,
      teamMemberRole: null,
    };
    mocks.getCurrentTenantContext.mockResolvedValue(context);

    await expect(
      assertTenantAccess("clinica-ana", { allowedRoles: ["NUTRITIONIST", "ADMIN"] })
    ).resolves.toMatchObject({ isGlobalAdmin: true, session: { role: "GLOBAL_ADMIN" } });

    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("continues to enforce the allowlist for non-global roles", async () => {
    mocks.getCurrentTenantContext.mockResolvedValue({
      session: { role: "VIEWER" },
      nutritionist: { id: "nutritionist_1" },
      permissions: new Set<string>(),
      isGlobalAdmin: false,
      isOwner: false,
      teamMemberRole: "VIEWER",
    });

    await expect(
      assertTenantAccess("clinica-ana", { allowedRoles: ["NUTRITIONIST", "ADMIN"] })
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard/clinica-ana");
  });
});
