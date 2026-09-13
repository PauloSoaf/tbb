import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
export const auditLogService = {
  async record(params: { workspaceId: string; actorUserId?: string; type: string; entityType: string; entityId: string; metadata?: Prisma.InputJsonValue }) {
    return prisma.activityEvent.create({ data: { ...params, source: "SYSTEM" } });
  },
};
