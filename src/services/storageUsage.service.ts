import { prisma } from "@/lib/prisma";
import { getTenantSubscriptionContext } from "@/lib/billing/subscription-context";

const MB = 1024 * 1024;

export interface StorageLimitCheck {
  allowed: boolean;
  usedBytes: number;
  limitBytes: number | null;
  incomingBytes: number;
  remainingBytes: number | null;
  percentUsed: number | null;
  planCode: string;
  blockedReason?: "SINGLE_FILE_LIMIT" | "TOTAL_QUOTA" | "PURPOSE_QUOTA";
  purpose?: string;
}

export interface TenantStorageBreakdown {
  purpose: string;
  fileCount: number;
  sizeBytes: number;
}

export interface TenantStorageByUploader {
  uploadedByUserId: string | null;
  userName: string;
  fileCount: number;
  sizeBytes: number;
}

export type StorageQuotaStatus = "unlimited" | "normal" | "attention" | "near_limit" | "blocked" | "no_data";

export interface StorageQuotaStatusResult {
  status: StorageQuotaStatus;
  usedBytes: number;
  limitBytes: number | null;
  percentUsed: number | null;
}

function statusForPercent(percentUsed: number | null): StorageQuotaStatus {
  if (percentUsed === null) return "unlimited";
  if (percentUsed >= 100) return "blocked";
  if (percentUsed >= 90) return "near_limit";
  if (percentUsed >= 70) return "attention";
  return "normal";
}

export const storageUsageService = {
  async recordUpload(
    tenantId: string,
    file: { url: string; sizeBytes: number; purpose: string; resourceId?: string; uploadedByUserId?: string }
  ) {
    return prisma.storageFile.create({
      data: {
        tenantId,
        url: file.url,
        sizeBytes: file.sizeBytes,
        purpose: file.purpose,
        resourceId: file.resourceId,
        uploadedByUserId: file.uploadedByUserId,
      },
    });
  },

  /** Best-effort: removes the ledger row for a deleted file. Safe to call even if no row matches. */
  async recordDeletion(tenantId: string, url: string) {
    await prisma.storageFile.deleteMany({ where: { tenantId, url } });
  },

  async getTenantUsageBytes(tenantId: string): Promise<number> {
    const result = await prisma.storageFile.aggregate({
      where: { tenantId },
      _sum: { sizeBytes: true },
    });
    return result._sum.sizeBytes ?? 0;
  },

  async getTenantUsageBytesForPurpose(tenantId: string, purpose: string): Promise<number> {
    const result = await prisma.storageFile.aggregate({
      where: { tenantId, purpose },
      _sum: { sizeBytes: true },
    });
    return result._sum.sizeBytes ?? 0;
  },

  async getTenantUsageBreakdown(tenantId: string): Promise<TenantStorageBreakdown[]> {
    const grouped = await prisma.storageFile.groupBy({
      by: ["purpose"],
      where: { tenantId },
      _sum: { sizeBytes: true },
      _count: { _all: true },
    });

    return grouped
      .map((g) => ({
        purpose: g.purpose,
        fileCount: g._count._all,
        sizeBytes: g._sum.sizeBytes ?? 0,
      }))
      .sort((a, b) => b.sizeBytes - a.sizeBytes);
  },

  async getTenantStorageByUploader(tenantId: string): Promise<TenantStorageByUploader[]> {
    const grouped = await prisma.storageFile.groupBy({
      by: ["uploadedByUserId"],
      where: { tenantId },
      _sum: { sizeBytes: true },
      _count: { _all: true },
    });

    const userIds = grouped.map((g) => g.uploadedByUserId).filter((id): id is string => !!id);
    const users = userIds.length
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];
    const nameById = new Map(users.map((u) => [u.id, u.name]));

    return grouped
      .map((g) => ({
        uploadedByUserId: g.uploadedByUserId,
        userName: g.uploadedByUserId ? nameById.get(g.uploadedByUserId) ?? "Usuário removido" : "Desconhecido (uploads antigos)",
        fileCount: g._count._all,
        sizeBytes: g._sum.sizeBytes ?? 0,
      }))
      .sort((a, b) => b.sizeBytes - a.sizeBytes);
  },

  /**
   * Checks whether uploading `incomingBytes` more would keep the tenant within
   * its plan's `storage.maxMb`, `storage.singleUpload.maxMb`, and (when
   * `purpose` is given and the plan defines `storage.<purpose>.maxMb`) the
   * per-category quota. Checked cheapest-first: single file -> per-purpose ->
   * total. Does not reserve/record anything — call `recordUpload` after the
   * actual upload succeeds.
   */
  async checkStorageLimit(tenantId: string, incomingBytes: number, purpose?: string): Promise<StorageLimitCheck> {
    const ctx = await getTenantSubscriptionContext(tenantId);
    const singleFileLimitMb = ctx.featureLimits["storage.singleUpload.maxMb"]?.limit ?? null;
    if (singleFileLimitMb !== null && incomingBytes > singleFileLimitMb * MB) {
      const limitBytes = singleFileLimitMb * MB;
      return {
        allowed: false,
        usedBytes: 0,
        limitBytes,
        incomingBytes,
        remainingBytes: null,
        percentUsed: null,
        planCode: ctx.planCode,
        blockedReason: "SINGLE_FILE_LIMIT",
      };
    }

    if (purpose) {
      const purposeLimitMb = ctx.featureLimits[`storage.${purpose}.maxMb`]?.limit ?? null;
      if (purposeLimitMb !== null) {
        const purposeLimitBytes = purposeLimitMb * MB;
        const purposeUsedBytes = await this.getTenantUsageBytesForPurpose(tenantId, purpose);
        if (purposeUsedBytes + incomingBytes > purposeLimitBytes) {
          return {
            allowed: false,
            usedBytes: purposeUsedBytes,
            limitBytes: purposeLimitBytes,
            incomingBytes,
            remainingBytes: Math.max(0, purposeLimitBytes - purposeUsedBytes),
            percentUsed: Math.round((purposeUsedBytes / purposeLimitBytes) * 100),
            planCode: ctx.planCode,
            blockedReason: "PURPOSE_QUOTA",
            purpose,
          };
        }
      }
    }

    const limitMb = ctx.featureLimits["storage.maxMb"]?.limit ?? null;
    const usedBytes = await this.getTenantUsageBytes(tenantId);

    if (limitMb === null) {
      return {
        allowed: true,
        usedBytes,
        limitBytes: null,
        incomingBytes,
        remainingBytes: null,
        percentUsed: null,
        planCode: ctx.planCode,
      };
    }

    const limitBytes = limitMb * MB;
    const allowed = usedBytes + incomingBytes <= limitBytes;
    return {
      allowed,
      usedBytes,
      limitBytes,
      incomingBytes,
      remainingBytes: Math.max(0, limitBytes - usedBytes),
      percentUsed: Math.round((usedBytes / limitBytes) * 100),
      planCode: ctx.planCode,
      blockedReason: allowed ? undefined : "TOTAL_QUOTA",
    };
  },

  async getStorageQuotaStatus(tenantId: string): Promise<StorageQuotaStatusResult> {
    const ctx = await getTenantSubscriptionContext(tenantId);
    const limitMb = ctx.featureLimits["storage.maxMb"]?.limit ?? null;
    const usedBytes = await this.getTenantUsageBytes(tenantId);

    if (limitMb === null) {
      return { status: "unlimited", usedBytes, limitBytes: null, percentUsed: null };
    }

    const limitBytes = limitMb * MB;
    const percentUsed = limitBytes > 0 ? Math.round((usedBytes / limitBytes) * 100) : 0;
    return { status: statusForPercent(percentUsed), usedBytes, limitBytes, percentUsed };
  },

  /** Cross-tenant totals for the Global Admin overview. */
  async getGlobalStorageOverview() {
    const [totalAgg, totalFiles, byTenant] = await Promise.all([
      prisma.storageFile.aggregate({ _sum: { sizeBytes: true } }),
      prisma.storageFile.count(),
      prisma.storageFile.groupBy({
        by: ["tenantId"],
        _sum: { sizeBytes: true },
        _count: { _all: true },
        orderBy: { _sum: { sizeBytes: "desc" } },
        take: 10,
      }),
    ]);

    const tenantIds = byTenant.map((t) => t.tenantId);
    const nutritionists = await prisma.nutritionist.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true, slug: true },
    });
    const nameById = new Map(nutritionists.map((n) => [n.id, n]));

    return {
      totalBytes: totalAgg._sum.sizeBytes ?? 0,
      totalFiles,
      topTenants: byTenant.map((t) => ({
        tenantId: t.tenantId,
        name: nameById.get(t.tenantId)?.name ?? "—",
        slug: nameById.get(t.tenantId)?.slug ?? "",
        sizeBytes: t._sum.sizeBytes ?? 0,
        fileCount: t._count._all,
      })),
    };
  },

  /** Storage totals grouped by the tenant's current plan code, for the Global Admin storage page. */
  async getGlobalStorageByPlan() {
    const nutritionists = await prisma.nutritionist.findMany({
      select: { id: true, subscription: { select: { plan: { select: { code: true } } } } },
    });
    const planByTenant = new Map(nutritionists.map((n) => [n.id, n.subscription?.plan.code ?? "FREE"]));

    const byTenant = await prisma.storageFile.groupBy({
      by: ["tenantId"],
      _sum: { sizeBytes: true },
      _count: { _all: true },
    });

    const totals = new Map<string, { sizeBytes: number; fileCount: number; tenantCount: number }>();
    for (const row of byTenant) {
      const plan = planByTenant.get(row.tenantId) ?? "FREE";
      const entry = totals.get(plan) ?? { sizeBytes: 0, fileCount: 0, tenantCount: 0 };
      entry.sizeBytes += row._sum.sizeBytes ?? 0;
      entry.fileCount += row._count._all;
      entry.tenantCount += 1;
      totals.set(plan, entry);
    }

    return Array.from(totals.entries()).map(([planCode, data]) => ({ planCode, ...data }));
  },
};
