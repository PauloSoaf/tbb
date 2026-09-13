"use server";

import { requireGlobalAdmin } from "@/lib/tenancy/requirePermission";
import { prisma } from "@/lib/prisma";
import { globalAuditLogService } from "@/services/global-audit-log.service";
import { auditLogService } from "@/services/audit-log.service";
import { storageUsageService } from "@/services/storageUsage.service";
import { revalidatePath } from "next/cache";

export async function listPlanFeatureLimitsAdminAction() {
  try {
    await requireGlobalAdmin({ throwOnFailure: true });
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { priceCents: "asc" },
      include: { featureLimits: { orderBy: { key: "asc" } } },
    });
    return { plans };
  } catch (err) {
    return { plans: [], error: err instanceof Error ? err.message : "Acesso negado." };
  }
}

/**
 * Updates a plan's FeatureLimit and returns how many tenants on that plan
 * already exceed the new limit (storage keys only — that's the one metric
 * we can cheaply compare against live usage). Does not block the save or
 * touch any tenant's files; it's informational so the admin isn't surprised.
 */
export async function updatePlanFeatureLimitAdminAction(
  planCode: string,
  key: string,
  limit: number | null,
  enabled: boolean
) {
  try {
    const session = await requireGlobalAdmin({ throwOnFailure: true });

    const plan = await prisma.subscriptionPlan.findUnique({ where: { code: planCode } });
    if (!plan) return { error: `Plano "${planCode}" não encontrado.` };

    const before = await prisma.featureLimit.findUnique({
      where: { planId_key: { planId: plan.id, key } },
    });

    const updated = await prisma.featureLimit.upsert({
      where: { planId_key: { planId: plan.id, key } },
      update: { limit, enabled },
      create: { planId: plan.id, key, limit, enabled },
    });

    let affectedTenants = 0;
    if (key === "storage.maxMb" && limit !== null) {
      const tenantsOnPlan = await prisma.nutritionist.findMany({
        where: { subscription: { planId: plan.id } },
        select: { id: true },
      });
      const limitBytes = limit * 1024 * 1024;
      const usages = await Promise.all(
        tenantsOnPlan.map((t) => storageUsageService.getTenantUsageBytes(t.id))
      );
      affectedTenants = usages.filter((bytes) => bytes > limitBytes).length;
    }

    await globalAuditLogService.record({
      actor: { userId: session.userId, name: "Global Admin", role: "GLOBAL_ADMIN" },
      action: "storage.plan_limit.update",
      resource: "featureLimit",
      resourceId: updated.id,
      resourceLabelSnapshot: `${planCode}.${key}`,
      result: "SUCCESS",
      changedFields: ["limit", "enabled"],
      reason: `Limite "${key}" do plano ${planCode} alterado de ${before?.limit ?? "∞"}/${before?.enabled ?? "?"} para ${limit ?? "∞"}/${enabled}`,
      metadata: { planCode, key, previousLimit: before?.limit ?? null, newLimit: limit, affectedTenants },
    });

    revalidatePath("/admin/planos");
    revalidatePath("/admin/storage");
    revalidatePath("/admin/tenants");
    return { success: true, featureLimit: updated, affectedTenants };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao atualizar limite do plano." };
  }
}

export async function getGlobalStorageOverviewAdminAction() {
  try {
    await requireGlobalAdmin({ throwOnFailure: true });
    const overview = await storageUsageService.getGlobalStorageOverview();
    return { overview };
  } catch (err) {
    return { overview: null, error: err instanceof Error ? err.message : "Acesso negado." };
  }
}

export async function listTenantFeatureOverridesAdminAction(tenantId: string) {
  try {
    await requireGlobalAdmin({ throwOnFailure: true });
    const overrides = await prisma.tenantFeatureOverride.findMany({
      where: { tenantId },
      orderBy: { key: "asc" },
    });
    return { overrides };
  } catch (err) {
    return { overrides: [], error: err instanceof Error ? err.message : "Acesso negado." };
  }
}

export async function upsertTenantFeatureOverrideAdminAction(
  tenantId: string,
  key: string,
  limit: number | null,
  enabled: boolean,
  reason: string,
  expiresAt: string | null
) {
  try {
    const session = await requireGlobalAdmin({ throwOnFailure: true });

    const nutritionist = await prisma.nutritionist.findUnique({ where: { id: tenantId } });
    if (!nutritionist) return { error: "Clínica não encontrada." };

    const before = await prisma.tenantFeatureOverride.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });

    const override = await prisma.tenantFeatureOverride.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: { limit, enabled, reason, expiresAt: expiresAt ? new Date(expiresAt) : null },
      create: {
        tenantId,
        key,
        limit,
        enabled,
        reason,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdByUserId: session.userId,
      },
    });

    await auditLogService.record({
      tenantId,
      actor: { userId: session.userId, name: "Global Admin", role: "GLOBAL_ADMIN" },
      action: before ? "storage.tenant_override.update" : "storage.tenant_override.create",
      resource: "tenantFeatureOverride",
      resourceId: override.id,
      resourceLabelSnapshot: key,
      result: "SUCCESS",
      reason: reason || undefined,
      metadata: { key, limit, enabled, expiresAt, previousLimit: before?.limit ?? null },
    });

    revalidatePath("/admin/storage");
    revalidatePath("/admin/tenants");
    return { success: true, override };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao salvar exceção do tenant." };
  }
}

export async function deleteTenantFeatureOverrideAdminAction(tenantId: string, key: string) {
  try {
    const session = await requireGlobalAdmin({ throwOnFailure: true });

    await prisma.tenantFeatureOverride.deleteMany({ where: { tenantId, key } });

    await auditLogService.record({
      tenantId,
      actor: { userId: session.userId, name: "Global Admin", role: "GLOBAL_ADMIN" },
      action: "storage.tenant_override.update",
      resource: "tenantFeatureOverride",
      resourceId: key,
      resourceLabelSnapshot: key,
      result: "SUCCESS",
      reason: `Exceção "${key}" removida — tenant volta ao limite padrão do plano.`,
    });

    revalidatePath("/admin/storage");
    revalidatePath("/admin/tenants");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao remover exceção." };
  }
}
