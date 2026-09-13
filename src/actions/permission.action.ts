"use server";

import { requirePermission, AuthorizationError } from "@/lib/tenancy/requirePermission";
import { permissionService } from "@/services/permission.service";
import { auditLogService } from "@/services/audit-log.service";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { PermissionEffect } from "@prisma/client";
import { invalidateTeam } from "@/lib/cache/invalidate-nutriopus-cache";
import { requireFeature, FeatureNotAvailableError } from "@/lib/billing/subscription-context";

export async function getPermissionsCatalogAction(tenantSlug: string) {
  let ctx;
  try {
    ctx = await requirePermission("team", "view", tenantSlug, { throwOnFailure: true });
  } catch {
    return { catalog: [], error: "Não autorizado" };
  }

  try {
    const catalog = await permissionService.getAllPermissions();
    return { catalog };
  } catch (err) {
    return { catalog: [], error: err instanceof Error ? err.message : "Erro ao carregar catálogo." };
  }
}

export async function getMemberPermissionsAction(tenantSlug: string, memberId: string) {
  let ctx;
  try {
    ctx = await requirePermission("team", "view", tenantSlug, { throwOnFailure: true });
  } catch {
    return { data: null, error: "Não autorizado" };
  }

  try {
    const data = await permissionService.getMemberPermissions(ctx.session.nutritionistId, memberId);
    return { data };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Erro ao carregar permissões do membro." };
  }
}

export async function updateMemberPermissionsAction(
  tenantSlug: string,
  memberId: string,
  overrides: { permissionId: string; effect: PermissionEffect }[]
) {
  let ctx;
  try {
    ctx = await requirePermission("team", "editPermissions", tenantSlug, { throwOnFailure: true });
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    return { error: "Não autorizado." };
  }

  try {
    await requireFeature(ctx.session.nutritionistId, "rbacOverrides.enabled");
  } catch (err) {
    if (err instanceof FeatureNotAvailableError) {
      return { error: "Overrides de permissão por membro não estão disponíveis no seu plano atual. Faça upgrade para PRO ou Clínica." };
    }
    return { error: "Erro ao validar plano." };
  }

  try {
    const updated = await permissionService.setMemberOverrides(ctx.session.nutritionistId, memberId, overrides);
    invalidateTeam({ nutritionistId: ctx.session.nutritionistId, tenant: tenantSlug });

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || undefined;

    await auditLogService.record({
      tenantId: ctx.session.nutritionistId,
      actor: {
        userId: ctx.userId,
        teamMemberId: ctx.teamMemberId,
        name: ctx.isGlobalAdmin ? "Global Admin" : ctx.nutritionist.name,
        role: ctx.role,
      },
      action: "team.permissions.update",
      resource: "team",
      resourceId: memberId,
      result: "SUCCESS",
      changedFields: ["overrides"],
      requestContext: { ip, userAgent },
    });

    revalidatePath(`/dashboard/${tenantSlug}/configuracoes/equipe`);
    return { success: true, overrides: updated };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao atualizar permissões." };
  }
}
