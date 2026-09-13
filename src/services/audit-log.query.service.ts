import { prisma } from "@/lib/prisma";
import type { AuditResult, Prisma } from "@prisma/client";

export interface AuditLogFilters {
  tenantId: string;
  actorUserId?: string;
  patientId?: string;
  resource?: string;
  action?: string;
  result?: AuditResult;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogUIData {
  id: string;
  tenantId: string;
  actorUserId: string;
  actorTeamMemberId: string | null;
  actorNameSnapshot: string;
  actorRoleSnapshot: string;
  action: string;
  resource: string;
  resourceId: string;
  resourceLabelSnapshot: string | null;
  patientId: string | null;
  patientNameSnapshot: string | null;
  result: AuditResult;
  reason: string | null;
  changedFields: string[];
  ipHash: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface PaginatedAuditLogs {
  data: AuditLogUIData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const auditLogQueryService = {
  /**
   * Queries audit logs for a tenant with server-side pagination, sorting and filtering.
   * Never returns raw sensitive metadata.
   */
  async queryLogs(filters: AuditLogFilters): Promise<PaginatedAuditLogs> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.AuditLogWhereInput = {
      tenantId: filters.tenantId,
    };

    if (filters.actorUserId) {
      where.actorUserId = filters.actorUserId;
    }
    if (filters.patientId) {
      where.patientId = filters.patientId;
    }
    if (filters.resource) {
      where.resource = filters.resource;
    }
    if (filters.action) {
      where.action = filters.action;
    }
    if (filters.result) {
      where.result = filters.result;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { actorNameSnapshot: { contains: q, mode: "insensitive" } },
        { patientNameSnapshot: { contains: q, mode: "insensitive" } },
        { resourceLabelSnapshot: { contains: q, mode: "insensitive" } },
        { action: { contains: q, mode: "insensitive" } },
        { reason: { contains: q, mode: "insensitive" } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          tenantId: true,
          actorUserId: true,
          actorTeamMemberId: true,
          actorNameSnapshot: true,
          actorRoleSnapshot: true,
          action: true,
          resource: true,
          resourceId: true,
          resourceLabelSnapshot: true,
          patientId: true,
          patientNameSnapshot: true,
          result: true,
          reason: true,
          changedFields: true,
          ipHash: true,
          userAgent: true,
          createdAt: true,
          // Explicitly omit `metadata` from standard query
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: records,
      total,
      page,
      pageSize,
      totalPages,
    };
  },
};
