import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { storageUsageService } from "@/services/storageUsage.service";
import { getTenantSubscriptionContext } from "@/lib/billing/subscription-context";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    storageUsageSnapshot: { upsert: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
    storageUsageByPurposeSnapshot: { deleteMany: vi.fn(), createMany: vi.fn() },
    storageFile: { findMany: vi.fn() },
  },
}));

vi.mock("@/services/storageUsage.service", () => ({
  storageUsageService: {
    getTenantUsageBytes: vi.fn(),
    getTenantUsageBreakdown: vi.fn(),
  },
}));

vi.mock("@/lib/billing/subscription-context", () => ({
  getTenantSubscriptionContext: vi.fn(),
}));

import { storageSnapshotService } from "@/services/admin/storage-snapshot.service";

const upsert = vi.mocked(prisma.storageUsageSnapshot.upsert);
const getUsageBytes = vi.mocked(storageUsageService.getTenantUsageBytes);
const getBreakdown = vi.mocked(storageUsageService.getTenantUsageBreakdown);
const getContext = vi.mocked(getTenantSubscriptionContext);

const MB = 1024 * 1024;
// The exact value that overflows a 32-bit INTEGER column — this is a regression
// test for a real bug found while building this feature (CLINIC plan's 20GB
// quota, 20000 * 1024 * 1024 = 20,971,520,000 bytes > Int32 max ~2.147B).
const CLINIC_QUOTA_MB = 20000;

describe("storageSnapshotService.createTenantStorageSnapshot", () => {
  afterEach(() => vi.clearAllMocks());

  it("converts totalBytes/quotaBytes to BigInt when they exceed 32-bit INTEGER range", async () => {
    getUsageBytes.mockResolvedValue(500_000_000);
    getBreakdown.mockResolvedValue([{ purpose: "transcription-audio", fileCount: 1, sizeBytes: 500_000_000 }]);
    getContext.mockResolvedValue({
      tenantId: "t1",
      planCode: "CLINIC",
      status: "ACTIVE",
      featureLimits: { "storage.maxMb": { limit: CLINIC_QUOTA_MB, enabled: true } },
    } as never);
    upsert.mockResolvedValue({ id: "snap1" } as never);

    await storageSnapshotService.createTenantStorageSnapshot("t1", new Date("2026-07-29"));

    const call = upsert.mock.calls[0][0] as { create: { totalBytes: bigint; quotaBytes: bigint | null } };
    expect(typeof call.create.totalBytes).toBe("bigint");
    expect(call.create.totalBytes).toBe(BigInt(500_000_000));
    expect(call.create.quotaBytes).toBe(BigInt(CLINIC_QUOTA_MB) * BigInt(MB));
    expect(call.create.quotaBytes! > BigInt(2_147_483_647)).toBe(true); // proves it's genuinely over Int32 range
  });

  it("upserts on (tenantId, snapshotDate) so a same-day re-run updates instead of duplicating", async () => {
    getUsageBytes.mockResolvedValue(1000);
    getBreakdown.mockResolvedValue([]);
    getContext.mockResolvedValue({
      tenantId: "t1",
      planCode: "FREE",
      status: "TRIAL",
      featureLimits: {},
    } as never);
    upsert.mockResolvedValue({ id: "snap1" } as never);

    const date = new Date("2026-07-29");
    await storageSnapshotService.createTenantStorageSnapshot("t1", date);

    const call = upsert.mock.calls[0][0] as { where: { tenantId_snapshotDate: { tenantId: string; snapshotDate: Date } } };
    expect(call.where.tenantId_snapshotDate).toEqual({ tenantId: "t1", snapshotDate: date });
  });

  it("stores quotaBytes as null when the plan has no storage.maxMb limit (unlimited)", async () => {
    getUsageBytes.mockResolvedValue(1000);
    getBreakdown.mockResolvedValue([]);
    getContext.mockResolvedValue({
      tenantId: "t1",
      planCode: "CLINIC",
      status: "ACTIVE",
      featureLimits: {},
    } as never);
    upsert.mockResolvedValue({ id: "snap1" } as never);

    await storageSnapshotService.createTenantStorageSnapshot("t1");

    const call = upsert.mock.calls[0][0] as { create: { quotaBytes: bigint | null; usedPercent: number | null } };
    expect(call.create.quotaBytes).toBeNull();
    expect(call.create.usedPercent).toBeNull();
  });
});

describe("storageSnapshotService.getGlobalStorageHistory", () => {
  afterEach(() => vi.clearAllMocks());

  it("converts the grouped BigInt sum back to a plain number", async () => {
    vi.mocked(prisma.storageUsageSnapshot.groupBy).mockResolvedValue([
      { snapshotDate: new Date("2026-07-29"), _sum: { totalBytes: BigInt(25_000_000_000), totalFiles: 42 } },
    ] as never);

    const history = await storageSnapshotService.getGlobalStorageHistory(7);

    expect(history).toEqual([
      { date: "2026-07-29", totalBytes: 25_000_000_000, totalFiles: 42, usedPercent: null },
    ]);
    expect(typeof history[0].totalBytes).toBe("number");
  });
});
