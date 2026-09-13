import { auditLogService, type RecordAuditLogParams } from "@/services/audit-log.service";
import { getCurrentTenantContext } from "@/lib/tenancy/getCurrentTenantContext";
import { AuthorizationError } from "@/lib/tenancy/requirePermission";
import { headers } from "next/headers";

/**
 * Helper to record audit log inside Server Actions automatically capturing headers and tenant actor context.
 */
export async function withAuditLog<T>(
  auditMeta: {
    action: string;
    resource: string;
    resourceId?: string;
    resourceLabelSnapshot?: string;
    patientId?: string;
    patientNameSnapshot?: string;
    changedFields?: string[];
  },
  callback: () => Promise<T>
): Promise<T> {
  const ctx = await getCurrentTenantContext();
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || undefined;
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || undefined;

  const actor = ctx
    ? {
        userId: ctx.userId,
        teamMemberId: ctx.teamMemberId,
        name: ctx.session.role === "GLOBAL_ADMIN" ? "Global Admin" : ctx.nutritionist.name,
        role: ctx.role,
      }
    : {
        userId: "unknown",
        name: "Unknown",
        role: "VIEWER",
      };

  const tenantId = ctx?.nutritionistId || "unknown-tenant";

  try {
    const result = await callback();

    // Check if result returned an action error { error: string }
    if (result && typeof result === "object" && "error" in result && typeof (result as Record<string, unknown>).error === "string") {
      const errorMsg = (result as Record<string, unknown>).error as string;
      await auditLogService.record({
        tenantId,
        actor,
        action: auditMeta.action,
        resource: auditMeta.resource,
        resourceId: auditMeta.resourceId || "unknown",
        resourceLabelSnapshot: auditMeta.resourceLabelSnapshot,
        patientId: auditMeta.patientId,
        patientNameSnapshot: auditMeta.patientNameSnapshot,
        result: errorMsg.toLowerCase().includes("autorizado") || errorMsg.toLowerCase().includes("permissão") ? "DENIED" : "FAILURE",
        reason: errorMsg,
        changedFields: auditMeta.changedFields,
        requestContext: { ip, userAgent },
      });
    } else {
      await auditLogService.record({
        tenantId,
        actor,
        action: auditMeta.action,
        resource: auditMeta.resource,
        resourceId: auditMeta.resourceId || "unknown",
        resourceLabelSnapshot: auditMeta.resourceLabelSnapshot,
        patientId: auditMeta.patientId,
        patientNameSnapshot: auditMeta.patientNameSnapshot,
        result: "SUCCESS",
        changedFields: auditMeta.changedFields,
        requestContext: { ip, userAgent },
      });
    }

    return result;
  } catch (err) {
    const isAuthErr = err instanceof AuthorizationError;
    const reason = err instanceof Error ? err.message : "Unexpected error";

    await auditLogService.record({
      tenantId,
      actor,
      action: auditMeta.action,
      resource: auditMeta.resource,
      resourceId: auditMeta.resourceId || "unknown",
      resourceLabelSnapshot: auditMeta.resourceLabelSnapshot,
      patientId: auditMeta.patientId,
      patientNameSnapshot: auditMeta.patientNameSnapshot,
      result: isAuthErr ? "DENIED" : "FAILURE",
      reason,
      changedFields: auditMeta.changedFields,
      requestContext: { ip, userAgent },
    });

    throw err;
  }
}
