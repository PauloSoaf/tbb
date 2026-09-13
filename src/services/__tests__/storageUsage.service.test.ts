import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getTenantSubscriptionContext } from "@/lib/billing/subscription-context";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    storageFile: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    nutritionist: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/billing/subscription-context", () => ({
  getTenantSubscriptionContext: vi.fn(),
}));

import { storageUsageService } from "@/services/storageUsage.service";

const aggregate = vi.mocked(prisma.storageFile.aggregate);
const getContext = vi.mocked(getTenantSubscriptionContext);

const MB = 1024 * 1024;

describe("storageUsageService.checkStorageLimit", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("allows the upload when total usage stays within the plan limit", async () => {
    getContext.mockResolvedValue({
      tenantId: "t1",
      planCode: "BASIC",
      status: "ACTIVE",
      featureLimits: { "storage.maxMb": { limit: 1000, enabled: true } },
    } as never);
    aggregate.mockResolvedValue({ _sum: { sizeBytes: 100 * MB } } as never);

    const result = await storageUsageService.checkStorageLimit("t1", 50 * MB);

    expect(result.allowed).toBe(true);
    expect(result.usedBytes).toBe(100 * MB);
    expect(result.limitBytes).toBe(1000 * MB);
    expect(result.percentUsed).toBe(10); // percentUsed reflects usage BEFORE this upload, not after
  });

  it("blocks the upload when it would exceed the total quota", async () => {
    getContext.mockResolvedValue({
      tenantId: "t1",
      planCode: "FREE",
      status: "TRIAL",
      featureLimits: { "storage.maxMb": { limit: 200, enabled: true } },
    } as never);
    aggregate.mockResolvedValue({ _sum: { sizeBytes: 190 * MB } } as never);

    const result = await storageUsageService.checkStorageLimit("t1", 20 * MB);

    expect(result.allowed).toBe(false);
    expect(result.blockedReason).toBe("TOTAL_QUOTA");
    expect(result.remainingBytes).toBe(10 * MB);
  });

  it("is always allowed when the plan has no storage limit configured (unlimited)", async () => {
    getContext.mockResolvedValue({
      tenantId: "t1",
      planCode: "CLINIC",
      status: "ACTIVE",
      featureLimits: { "storage.maxMb": { limit: null, enabled: true } },
    } as never);
    aggregate.mockResolvedValue({ _sum: { sizeBytes: 500 * 1024 * MB } } as never);

    const result = await storageUsageService.checkStorageLimit("t1", 999 * 1024 * MB);

    expect(result.allowed).toBe(true);
    expect(result.limitBytes).toBeNull();
    expect(result.percentUsed).toBeNull();
  });

  it("blocks a single file that exceeds storage.singleUpload.maxMb, before checking the total quota", async () => {
    getContext.mockResolvedValue({
      tenantId: "t1",
      planCode: "FREE",
      status: "TRIAL",
      featureLimits: {
        "storage.maxMb": { limit: 200, enabled: true },
        "storage.singleUpload.maxMb": { limit: 10, enabled: true },
      },
    } as never);

    const result = await storageUsageService.checkStorageLimit("t1", 15 * MB);

    expect(result.allowed).toBe(false);
    expect(result.blockedReason).toBe("SINGLE_FILE_LIMIT");
    expect(aggregate).not.toHaveBeenCalled(); // rejected before even querying total usage
  });

  it("blocks by purpose quota even when the total quota still has room", async () => {
    getContext.mockResolvedValue({
      tenantId: "t1",
      planCode: "FREE",
      status: "TRIAL",
      featureLimits: {
        "storage.maxMb": { limit: 200, enabled: true },
        "storage.transcription-audio.maxMb": { limit: 10, enabled: true },
      },
    } as never);
    aggregate.mockResolvedValue({ _sum: { sizeBytes: 9 * MB } } as never); // 9MB already used for this purpose

    const result = await storageUsageService.checkStorageLimit("t1", 5 * MB, "transcription-audio");

    expect(result.allowed).toBe(false);
    expect(result.blockedReason).toBe("PURPOSE_QUOTA");
    expect(result.purpose).toBe("transcription-audio");
  });

  it("ignores the purpose quota when the plan doesn't define one for that purpose", async () => {
    getContext.mockResolvedValue({
      tenantId: "t1",
      planCode: "PRO",
      status: "ACTIVE",
      featureLimits: { "storage.maxMb": { limit: 5000, enabled: true } },
    } as never);
    aggregate.mockResolvedValue({ _sum: { sizeBytes: 100 * MB } } as never);

    const result = await storageUsageService.checkStorageLimit("t1", 5 * MB, "transcription-audio");

    expect(result.allowed).toBe(true);
  });

  it("treats a missing storage.maxMb FeatureLimit as unlimited, not blocked", async () => {
    getContext.mockResolvedValue({
      tenantId: "t1",
      planCode: "FREE",
      status: "TRIAL",
      featureLimits: {},
    } as never);

    const result = await storageUsageService.checkStorageLimit("t1", 1 * MB);

    expect(result.allowed).toBe(true);
    expect(result.limitBytes).toBeNull();
  });
});

describe("storageUsageService.getStorageQuotaStatus", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [0, "normal"],
    [69, "normal"],
    [70, "attention"],
    [89, "attention"],
    [90, "near_limit"],
    [99, "near_limit"],
    [100, "blocked"],
    [120, "blocked"],
  ])("percent %i maps to status %s", async (usedPercent, expectedStatus) => {
    const limitMb = 1000;
    getContext.mockResolvedValue({
      tenantId: "t1",
      planCode: "BASIC",
      status: "ACTIVE",
      featureLimits: { "storage.maxMb": { limit: limitMb, enabled: true } },
    } as never);
    aggregate.mockResolvedValue({ _sum: { sizeBytes: Math.round((usedPercent / 100) * limitMb * MB) } } as never);

    const result = await storageUsageService.getStorageQuotaStatus("t1");

    expect(result.status).toBe(expectedStatus);
  });

  it("returns 'unlimited' when the plan has no storage limit", async () => {
    getContext.mockResolvedValue({
      tenantId: "t1",
      planCode: "CLINIC",
      status: "ACTIVE",
      featureLimits: { "storage.maxMb": { limit: null, enabled: true } },
    } as never);

    const result = await storageUsageService.getStorageQuotaStatus("t1");

    expect(result.status).toBe("unlimited");
    expect(result.percentUsed).toBeNull();
  });
});
