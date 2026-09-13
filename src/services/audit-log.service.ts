import { prisma } from "@/lib/prisma";
import type { AuditResult, Prisma } from "@prisma/client";
import { createHash } from "crypto";

export interface RecordAuditLogParams {
  tenantId: string;
  actor: {
    userId: string;
    teamMemberId?: string | null;
    name: string;
    role: string;
  };
  action: string;
  resource: string;
  resourceId: string;
  resourceLabelSnapshot?: string | null;
  patientId?: string | null;
  patientNameSnapshot?: string | null;
  appointmentId?: string | null;
  result?: AuditResult;
  reason?: string | null;
  changedFields?: string[];
  metadata?: Record<string, unknown> | null;
  requestContext?: {
    ip?: string | null;
    userAgent?: string | null;
    sessionId?: string | null;
  };
}

/**
 * Sanitizes metadata object to ensure no raw clinical texts or sensitive health values are stored.
 */
function sanitizeMetadata(raw?: Record<string, unknown> | null): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  const sanitized: Record<string, unknown> = {};

  const sensitiveKeys = [
    "notes",
    "notesSnapshot",
    "summary",
    "payload",
    "text",
    "textSnapshot",
    "transcript",
    "transcription",
    "rawTranscript",
    "editedTranscript",
    "reviewedText",
    "clinicalSummary",
    "patientFriendlySummary",
    "audio",
    "bodyFat",
    "weight",
    "height",
    "skinfolds",
    "measurements",
    "password",
    "token",
    "prontuario",
  ];

  for (const [key, value] of Object.entries(raw)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = "[SENSITIVE_DATA_REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export const auditLogService = {
  /**
   * Records an immutable audit log entry.
   * Fire-and-forget or awaited depending on caller severity.
   */
  async record(params: RecordAuditLogParams) {
    try {
      const ipHash = params.requestContext?.ip
        ? createHash("sha256").update(params.requestContext.ip).digest("hex").slice(0, 16)
        : undefined;

      const sanitizedMetadata = sanitizeMetadata(params.metadata);

      return await prisma.auditLog.create({
        data: {
          tenantId: params.tenantId,
          actorUserId: params.actor.userId,
          actorTeamMemberId: params.actor.teamMemberId || undefined,
          actorNameSnapshot: params.actor.name,
          actorRoleSnapshot: params.actor.role,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          resourceLabelSnapshot: params.resourceLabelSnapshot || undefined,
          patientId: params.patientId || undefined,
          patientNameSnapshot: params.patientNameSnapshot || undefined,
          appointmentId: params.appointmentId || undefined,
          result: params.result || "SUCCESS",
          reason: params.reason || undefined,
          changedFields: params.changedFields || [],
          metadata: (sanitizedMetadata as Prisma.InputJsonValue) || undefined,
          ipHash,
          userAgent: params.requestContext?.userAgent?.slice(0, 255) || undefined,
          sessionId: params.requestContext?.sessionId || undefined,
        },
      });
    } catch (err) {
      // Audit logging must never crash the main clinical flow if DB fails,
      // but should be logged to stderr/system monitor
      console.error("[AUDIT_LOG_ERROR] Failed to record audit log:", err);
    }
  },
};
