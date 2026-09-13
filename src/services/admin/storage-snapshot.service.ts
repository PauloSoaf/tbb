import { prisma } from "@/lib/prisma";
import { storageUsageService } from "@/services/storageUsage.service";
import { getTenantSubscriptionContext } from "@/lib/billing/subscription-context";

const MB = 1024 * 1024;

/** Midnight UTC for "today" — the natural key for one snapshot per tenant per day. */
function todaySnapshotDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export interface StorageHistoryPoint {
  date: string; // YYYY-MM-DD
  totalBytes: number;
  totalFiles: number;
  usedPercent: number | null;
}

export const storageSnapshotService = {
  /**
   * Writes (or overwrites, if already run today) one snapshot row for a
   * single tenant plus its per-purpose breakdown. Upsert on
   * (tenantId, snapshotDate) makes this safe to call more than once for the
   * same day — required because Vercel Cron delivery can invoke the same
   * scheduled run more than once (see Vercel Cron Jobs docs on idempotency).
   *
   * `totalBytes`/`quotaBytes`/`sizeBytes` are stored as BigInt: a single
   * tenant's usage (or the CLINIC plan's 20GB quota) in bytes already
   * exceeds a 32-bit INTEGER's ~2.1B ceiling — confirmed by a real overflow
   * error while building this service.
   */
  async createTenantStorageSnapshot(tenantId: string, snapshotDate: Date = todaySnapshotDate()) {
    const [totalBytes, breakdown, ctx] = await Promise.all([
      storageUsageService.getTenantUsageBytes(tenantId),
      storageUsageService.getTenantUsageBreakdown(tenantId),
      getTenantSubscriptionContext(tenantId),
    ]);

    const limitMb = ctx.featureLimits["storage.maxMb"]?.limit ?? null;
    const quotaBytes = limitMb !== null ? limitMb * MB : null;
    const usedPercent = quotaBytes ? Math.round((totalBytes / quotaBytes) * 100) : null;
    const totalFiles = breakdown.reduce((sum, b) => sum + b.fileCount, 0);

    const snapshot = await prisma.storageUsageSnapshot.upsert({
      where: { tenantId_snapshotDate: { tenantId, snapshotDate } },
      update: {
        totalBytes: BigInt(totalBytes),
        totalFiles,
        quotaBytes: quotaBytes !== null ? BigInt(quotaBytes) : null,
        usedPercent,
      },
      create: {
        tenantId,
        snapshotDate,
        totalBytes: BigInt(totalBytes),
        totalFiles,
        quotaBytes: quotaBytes !== null ? BigInt(quotaBytes) : null,
        usedPercent,
      },
    });

    // Replace the purpose breakdown for this snapshot (cheap: at most a
    // handful of purposes per tenant) rather than trying to diff it.
    await prisma.storageUsageByPurposeSnapshot.deleteMany({ where: { snapshotId: snapshot.id } });
    if (breakdown.length > 0) {
      await prisma.storageUsageByPurposeSnapshot.createMany({
        data: breakdown.map((b) => ({
          snapshotId: snapshot.id,
          tenantId,
          purpose: b.purpose,
          sizeBytes: BigInt(b.sizeBytes),
          fileCount: b.fileCount,
        })),
      });
    }

    return snapshot;
  },

  /**
   * Snapshots every tenant that has at least one file (skipping tenants with
   * zero storage keeps the table from growing with all-zero rows for
   * inactive accounts). Called by the daily cron — see /api/cron/storage-snapshot.
   */
  async createAllTenantSnapshots(): Promise<{ tenantsSnapshotted: number }> {
    const tenantIds = await prisma.storageFile.findMany({
      distinct: ["tenantId"],
      select: { tenantId: true },
    });

    const snapshotDate = todaySnapshotDate();
    for (const { tenantId } of tenantIds) {
      await this.createTenantStorageSnapshot(tenantId, snapshotDate);
    }

    return { tenantsSnapshotted: tenantIds.length };
  },

  async getTenantStorageHistory(tenantId: string, days = 30): Promise<StorageHistoryPoint[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await prisma.storageUsageSnapshot.findMany({
      where: { tenantId, snapshotDate: { gte: since } },
      orderBy: { snapshotDate: "asc" },
    });

    return rows.map((r) => ({
      date: r.snapshotDate.toISOString().slice(0, 10),
      totalBytes: Number(r.totalBytes),
      totalFiles: r.totalFiles,
      usedPercent: r.usedPercent,
    }));
  },

  /** Cross-tenant growth curve for the Global Admin storage page — sums every tenant's snapshot per day. */
  async getGlobalStorageHistory(days = 30): Promise<StorageHistoryPoint[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const grouped = await prisma.storageUsageSnapshot.groupBy({
      by: ["snapshotDate"],
      where: { snapshotDate: { gte: since } },
      _sum: { totalBytes: true, totalFiles: true },
      orderBy: { snapshotDate: "asc" },
    });

    return grouped.map((g) => ({
      date: g.snapshotDate.toISOString().slice(0, 10),
      totalBytes: Number(g._sum.totalBytes ?? BigInt(0)),
      totalFiles: g._sum.totalFiles ?? 0,
      usedPercent: null,
    }));
  },
};
