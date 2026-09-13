"use server";

import { requireGlobalAdmin } from "@/lib/tenancy/requirePermission";
import { prisma } from "@/lib/prisma";
import { globalAuditLogService } from "@/services/global-audit-log.service";
import { storageSnapshotService } from "@/services/admin/storage-snapshot.service";
import { storageUsageService } from "@/services/storageUsage.service";
import { storageReconciliationService } from "@/services/admin/storage-reconciliation.service";
import { dbMetricsService } from "@/services/admin/db-metrics.service";

const SNAPSHOT_REFRESH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes — avoid re-scanning every tenant on every click

export async function refreshStorageSnapshotAdminAction() {
  try {
    const session = await requireGlobalAdmin({ throwOnFailure: true });

    const lastSnapshot = await prisma.storageUsageSnapshot.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (lastSnapshot && Date.now() - lastSnapshot.createdAt.getTime() < SNAPSHOT_REFRESH_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((SNAPSHOT_REFRESH_COOLDOWN_MS - (Date.now() - lastSnapshot.createdAt.getTime())) / 1000);
      return { error: `Snapshot já rodou recentemente. Tente novamente em ${waitSeconds}s.` };
    }

    const result = await storageSnapshotService.createAllTenantSnapshots();

    await globalAuditLogService.record({
      actor: { userId: session.userId, name: "Global Admin", role: "GLOBAL_ADMIN" },
      action: "storage.snapshot.created",
      resource: "storageUsageSnapshot",
      resourceId: "manual-refresh",
      result: "SUCCESS",
      reason: `Snapshot manual: ${result.tenantsSnapshotted} clínica(s)`,
    });

    return { success: true, ...result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao atualizar snapshot." };
  }
}

export async function getGlobalStorageHistoryAdminAction(days = 30) {
  try {
    await requireGlobalAdmin({ throwOnFailure: true });
    const history = await storageSnapshotService.getGlobalStorageHistory(days);
    return { history };
  } catch (err) {
    return { history: [], error: err instanceof Error ? err.message : "Acesso negado." };
  }
}

export async function getTenantStorageDetailAdminAction(tenantId: string) {
  try {
    await requireGlobalAdmin({ throwOnFailure: true });
    const [breakdown, byUploader, history, overrides] = await Promise.all([
      storageUsageService.getTenantUsageBreakdown(tenantId),
      storageUsageService.getTenantStorageByUploader(tenantId),
      storageSnapshotService.getTenantStorageHistory(tenantId, 30),
      prisma.tenantFeatureOverride.findMany({ where: { tenantId } }),
    ]);
    return { breakdown, byUploader, history, overrides };
  } catch (err) {
    return {
      breakdown: [],
      byUploader: [],
      history: [],
      overrides: [],
      error: err instanceof Error ? err.message : "Acesso negado.",
    };
  }
}

/**
 * Dry-run only — reports drift between the ledger and reality, never deletes
 * or mutates anything (per spec: "não deletar nada automaticamente nesta sprint").
 */
export async function runStorageReconciliationAdminAction() {
  try {
    const session = await requireGlobalAdmin({ throwOnFailure: true });
    const report = await storageReconciliationService.reconcile();

    await globalAuditLogService.record({
      actor: { userId: session.userId, name: "Global Admin", role: "GLOBAL_ADMIN" },
      action: "storage.reconciliation.run",
      resource: "storageFile",
      resourceId: "dry-run",
      result: "SUCCESS",
      reason: `Reconciliação dry-run: ${report.missingSizeCount} arquivo(s) com tamanho desconhecido, ${report.duplicateUrlCount} URL(s) duplicada(s)`,
      metadata: { ...report },
    });

    return { report };
  } catch (err) {
    return { report: null, error: err instanceof Error ? err.message : "Erro ao rodar reconciliação." };
  }
}

export async function getDbInfraMetricsAdminAction() {
  try {
    await requireGlobalAdmin({ throwOnFailure: true });
    const metrics = await dbMetricsService.getDatabaseMetrics();
    return { metrics };
  } catch (err) {
    return { metrics: null, error: err instanceof Error ? err.message : "Erro ao carregar métricas do banco." };
  }
}
