"use server";

import { requireGlobalAdmin } from "@/lib/tenancy/requirePermission";
import { globalAdminService } from "@/services/global-admin.service";
import { revalidatePath } from "next/cache";

export async function getGlobalMetricsAction() {
  try {
    await requireGlobalAdmin({ throwOnFailure: true });
    const metrics = await globalAdminService.getGlobalMetrics();
    return { metrics };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Acesso negado." };
  }
}

export async function listTenantsAdminAction(search?: string, planCode?: string, page = 1) {
  try {
    await requireGlobalAdmin({ throwOnFailure: true });
    const result = await globalAdminService.listTenants(search, planCode, page, 20);
    return { result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Acesso negado." };
  }
}

export async function updateTenantPlanAdminAction(tenantIdOrSlug: string, planCode: string, status: string) {
  try {
    const session = await requireGlobalAdmin({ throwOnFailure: true });
    const sub = await globalAdminService.updateTenantPlan(tenantIdOrSlug, planCode, status, {
      userId: session.userId,
      name: "Global Admin",
    });
    revalidatePath("/admin");
    revalidatePath("/admin/tenants");
    return { success: true, subscription: sub };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao alterar plano do tenant." };
  }
}

export async function listGlobalAuditLogsAction(page = 1) {
  try {
    await requireGlobalAdmin({ throwOnFailure: true });
    const result = await globalAdminService.listGlobalAuditLogs(page, 30);
    return { result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Acesso negado." };
  }
}
