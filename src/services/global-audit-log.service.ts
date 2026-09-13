import { prisma } from "@/lib/prisma";
import type { AuditResult, Prisma } from "@prisma/client";

export interface RecordGlobalAuditLogParams {
  actor: { userId: string; name: string; role: string };
  action: string;
  resource: string;
  resourceId: string;
  resourceLabelSnapshot?: string | null;
  result?: AuditResult;
  reason?: string | null;
  changedFields?: string[];
  metadata?: Record<string, unknown> | null;
}

/**
 * Audit trail for platform-level Global Admin actions not scoped to a single
 * tenant (plan catalog edits, tenant overrides). Separate from `auditLogService`
 * because `AuditLog.tenantId` has a required FK to `Nutritionist` — there is
 * no valid tenant to attribute a "changed the PRO plan for everyone" event to.
 */
export const globalAuditLogService = {
  async record(params: RecordGlobalAuditLogParams) {
    try {
      return await prisma.globalAuditLog.create({
        data: {
          actorUserId: params.actor.userId,
          actorNameSnapshot: params.actor.name,
          actorRoleSnapshot: params.actor.role,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          resourceLabelSnapshot: params.resourceLabelSnapshot || undefined,
          result: params.result || "SUCCESS",
          reason: params.reason || undefined,
          changedFields: params.changedFields || [],
          metadata: (params.metadata as Prisma.InputJsonValue) || undefined,
        },
      });
    } catch (err) {
      console.error("[GLOBAL_AUDIT_LOG_ERROR] Failed to record global audit log:", err);
    }
  },

  async list(page = 1, pageSize = 30) {
    const [total, data] = await Promise.all([
      prisma.globalAuditLog.count(),
      prisma.globalAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { data, total, totalPages: Math.ceil(total / pageSize) || 1, page };
  },
};
