import { prisma } from "@/lib/prisma";
import { storageUsageService, type StorageQuotaStatus } from "@/services/storageUsage.service";

const EVENT_TYPE_BY_STATUS: Partial<Record<StorageQuotaStatus, string>> = {
  attention: "STORAGE_QUOTA_WARNING_70",
  near_limit: "STORAGE_QUOTA_WARNING_90",
  blocked: "STORAGE_QUOTA_EXCEEDED",
};

const SEVERITY_BY_STATUS: Partial<Record<StorageQuotaStatus, string>> = {
  attention: "LOW",
  near_limit: "HIGH",
  blocked: "CRITICAL",
};

const TITLE_BY_STATUS: Partial<Record<StorageQuotaStatus, string>> = {
  attention: "Armazenamento em 70%+ da cota do plano",
  near_limit: "Armazenamento em 90%+ da cota do plano",
  blocked: "Cota de armazenamento do plano atingida",
};

/**
 * Threshold-crossing storage alert, reusing the existing `SecurityEvent`
 * model (same one used for MULTIPLE_FAILED_LOGINS-style alerts) instead of a
 * parallel "technical event" table. Fires once per tier per tenant — checks
 * for an already-OPEN event of the same type before creating a new one, so
 * visiting the dashboard 50 times while at 85% doesn't create 50 alerts.
 * Called opportunistically from `getMyStorageQuotaStatusAction` (on dashboard
 * load) rather than a dedicated cron, since it only needs to be eventually
 * consistent, not real-time.
 */
export const storageAlertService = {
  async checkAndEmitThresholdEvent(tenantId: string) {
    const status = await storageUsageService.getStorageQuotaStatus(tenantId);
    const type = EVENT_TYPE_BY_STATUS[status.status];
    if (!type) return null; // unlimited/normal/no_data — nothing to alert on

    const alreadyOpen = await prisma.securityEvent.findFirst({
      where: { tenantId, type, status: "OPEN" },
    });
    if (alreadyOpen) return null;

    // A worse tier supersedes any still-open lower-tier alert (e.g. going
    // from 75% straight to 100% shouldn't leave a stale "70%" alert open).
    const otherStorageTypes = Object.values(EVENT_TYPE_BY_STATUS).filter((t) => t !== type);
    await prisma.securityEvent.updateMany({
      where: { tenantId, type: { in: otherStorageTypes }, status: "OPEN" },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });

    return prisma.securityEvent.create({
      data: {
        tenantId,
        type,
        severity: SEVERITY_BY_STATUS[status.status]!,
        title: TITLE_BY_STATUS[status.status]!,
        description: `Uso atual: ${Math.round((status.usedBytes / (1024 * 1024)))} MB de ${
          status.limitBytes ? Math.round(status.limitBytes / (1024 * 1024)) : "?"
        } MB (${status.percentUsed}%).`,
        status: "OPEN",
      },
    });
  },
};
