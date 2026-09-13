import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenantSubscription: { findUnique: vi.fn() },
    tenantFeatureOverride: { findMany: vi.fn() },
    subscriptionPlan: { findUnique: vi.fn() },
  },
}));

import { getTenantSubscriptionContext, requireFeature, FeatureNotAvailableError } from "@/lib/billing/subscription-context";

const tenantSubscriptionFindUnique = vi.mocked(prisma.tenantSubscription.findUnique);
const tenantFeatureOverrideFindMany = vi.mocked(prisma.tenantFeatureOverride.findMany);
const subscriptionPlanFindUnique = vi.mocked(prisma.subscriptionPlan.findUnique);

function mockPlan(code: string, limits: { key: string; limit: number | null; enabled: boolean }[]) {
  subscriptionPlanFindUnique.mockResolvedValue({
    id: `plan-${code}`,
    code,
    featureLimits: limits,
  } as never);
}

describe("getTenantSubscriptionContext", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to FREE/TRIAL when the tenant has no subscription row", async () => {
    tenantSubscriptionFindUnique.mockResolvedValue(null);
    tenantFeatureOverrideFindMany.mockResolvedValue([]);
    mockPlan("FREE", [{ key: "storage.maxMb", limit: 200, enabled: true }]);

    const ctx = await getTenantSubscriptionContext("tenant-1");

    expect(ctx.planCode).toBe("FREE");
    expect(ctx.status).toBe("TRIAL");
    expect(ctx.featureLimits["storage.maxMb"]).toEqual({ limit: 200, enabled: true });
  });

  it("uses the plan's own limit when there is no override", async () => {
    tenantSubscriptionFindUnique.mockResolvedValue({
      status: "ACTIVE",
      plan: { code: "PRO" },
    } as never);
    tenantFeatureOverrideFindMany.mockResolvedValue([]);
    mockPlan("PRO", [{ key: "storage.maxMb", limit: 5000, enabled: true }]);

    const ctx = await getTenantSubscriptionContext("tenant-1");

    expect(ctx.featureLimits["storage.maxMb"].limit).toBe(5000);
  });

  it("a non-expired tenant override wins over the plan limit", async () => {
    tenantSubscriptionFindUnique.mockResolvedValue({
      status: "ACTIVE",
      plan: { code: "BASIC" },
    } as never);
    tenantFeatureOverrideFindMany.mockResolvedValue([
      { key: "storage.maxMb", limit: 25000, enabled: true, expiresAt: new Date("2099-01-01") },
    ] as never);
    mockPlan("BASIC", [{ key: "storage.maxMb", limit: 1000, enabled: true }]);

    const ctx = await getTenantSubscriptionContext("tenant-1");

    expect(ctx.featureLimits["storage.maxMb"].limit).toBe(25000);
  });

  it("ignores an expired tenant override and falls back to the plan limit", async () => {
    tenantSubscriptionFindUnique.mockResolvedValue({
      status: "ACTIVE",
      plan: { code: "BASIC" },
    } as never);
    tenantFeatureOverrideFindMany.mockResolvedValue([
      { key: "storage.maxMb", limit: 25000, enabled: true, expiresAt: new Date("2020-01-01") },
    ] as never);
    mockPlan("BASIC", [{ key: "storage.maxMb", limit: 1000, enabled: true }]);

    const ctx = await getTenantSubscriptionContext("tenant-1");

    expect(ctx.featureLimits["storage.maxMb"].limit).toBe(1000);
  });

  it("an override can also introduce a key the plan never defined", async () => {
    tenantSubscriptionFindUnique.mockResolvedValue({
      status: "ACTIVE",
      plan: { code: "FREE" },
    } as never);
    tenantFeatureOverrideFindMany.mockResolvedValue([
      { key: "rbacOverrides.enabled", limit: null, enabled: true, expiresAt: null },
    ] as never);
    mockPlan("FREE", []);

    const ctx = await getTenantSubscriptionContext("tenant-1");

    expect(ctx.featureLimits["rbacOverrides.enabled"]).toEqual({ limit: null, enabled: true });
  });
});

describe("requireFeature", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("throws FeatureNotAvailableError when the feature is disabled", async () => {
    tenantSubscriptionFindUnique.mockResolvedValue({ status: "TRIAL", plan: { code: "FREE" } } as never);
    tenantFeatureOverrideFindMany.mockResolvedValue([]);
    mockPlan("FREE", [{ key: "auditTrail.enabled", limit: null, enabled: false }]);

    await expect(requireFeature("tenant-1", "auditTrail.enabled")).rejects.toThrow(FeatureNotAvailableError);
  });

  it("throws FeatureNotAvailableError (fail-closed) when no FeatureLimit row exists for the key", async () => {
    tenantSubscriptionFindUnique.mockResolvedValue({ status: "TRIAL", plan: { code: "FREE" } } as never);
    tenantFeatureOverrideFindMany.mockResolvedValue([]);
    mockPlan("FREE", []);

    await expect(requireFeature("tenant-1", "someUnknown.feature")).rejects.toThrow(FeatureNotAvailableError);
  });

  it("resolves when the feature is enabled", async () => {
    tenantSubscriptionFindUnique.mockResolvedValue({ status: "ACTIVE", plan: { code: "PRO" } } as never);
    tenantFeatureOverrideFindMany.mockResolvedValue([]);
    mockPlan("PRO", [{ key: "auditTrail.enabled", limit: null, enabled: true }]);

    await expect(requireFeature("tenant-1", "auditTrail.enabled")).resolves.toMatchObject({ planCode: "PRO" });
  });
});
