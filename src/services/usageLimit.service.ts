import { prisma } from "@/lib/prisma";
import { requireFeature, UsageLimitExceededError } from "@/lib/billing/subscription-context";
export const usageLimitService = {
  async consume(workspaceId: string, key: string) {
    const ctx = await requireFeature(workspaceId, key);
    const limit = ctx.featureLimits[key].limit;
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
      const where = { workspaceId_key_periodStart: { workspaceId, key, periodStart } };
      const current = await tx.usageCounter.findUnique({ where });
      if (limit !== null && (current?.count ?? 0) >= limit) throw new UsageLimitExceededError(key, limit);
      return tx.usageCounter.upsert({ where, create: { workspaceId, key, periodStart, count: 1 }, update: { count: { increment: 1 } } });
    });
  },
};
