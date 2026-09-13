import { prisma } from "@/lib/prisma";
import { getTenantSubscriptionContext } from "@/lib/billing/subscription-context";

export interface UsageLimitCheck {
  allowed: boolean;
  current: number;
  limit: number | null;
}

/** Rolling monthly window, keyed by the first day of the current UTC month. */
function currentMonthPeriodStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export const usageLimitService = {
  /**
   * Checks a rolling counter-based limit (e.g. "mealPlanPdf.monthly") without incrementing it.
   * A `limit` of `null` on the plan's FeatureLimit means unlimited.
   */
  async checkUsageLimit(tenantId: string, key: string): Promise<UsageLimitCheck> {
    const ctx = await getTenantSubscriptionContext(tenantId);
    const feature = ctx.featureLimits[key];
    const limit = feature?.limit ?? null;
    if (limit === null) return { allowed: true, current: 0, limit: null };

    const periodStart = currentMonthPeriodStart();
    const counter = await prisma.usageCounter.findUnique({
      where: { tenantId_key_periodStart: { tenantId, key, periodStart } },
    });
    const current = counter?.count ?? 0;
    return { allowed: current < limit, current, limit };
  },

  /**
   * Atomically increments the rolling counter for `key`. Call only after
   * `checkUsageLimit` allowed the action, to avoid counting rejected attempts.
   */
  async incrementUsage(tenantId: string, key: string): Promise<number> {
    const periodStart = currentMonthPeriodStart();
    const counter = await prisma.usageCounter.upsert({
      where: { tenantId_key_periodStart: { tenantId, key, periodStart } },
      update: { count: { increment: 1 } },
      create: { tenantId, key, periodStart, count: 1 },
    });
    return counter.count;
  },

  /**
   * Checks a count-based entity limit (e.g. "patients.max", "team.max") against a
   * live count the caller already has (patients/team members are the source of
   * truth themselves — there's no separate UsageCounter row for them).
   */
  async checkEntityLimit(tenantId: string, key: string, currentCount: number): Promise<UsageLimitCheck> {
    const ctx = await getTenantSubscriptionContext(tenantId);
    const feature = ctx.featureLimits[key];
    const limit = feature?.limit ?? null;
    if (limit === null) return { allowed: true, current: currentCount, limit: null };
    return { allowed: currentCount < limit, current: currentCount, limit };
  },
};
