import { prisma } from "@/lib/prisma";

export interface PlanFeatureLimits {
  [key: string]: { limit: number | null; enabled: boolean };
}

export const billingPlanService = {
  /**
   * Feature/limit map for a plan, keyed by FeatureLimit.key
   * (e.g. "patients.max", "team.max", "mealPlanPdf.monthly", "auditTrail.enabled").
   */
  async getPlanFeatureLimits(planCode: string): Promise<PlanFeatureLimits> {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { code: planCode },
      include: { featureLimits: true },
    });

    const map: PlanFeatureLimits = {};
    for (const fl of plan?.featureLimits ?? []) {
      map[fl.key] = { limit: fl.limit, enabled: fl.enabled };
    }
    return map;
  },

  async getTenantPlanCode(tenantId: string): Promise<string> {
    const subscription = await prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });
    return subscription?.plan.code ?? "FREE";
  },

  async listPlans() {
    return prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceCents: "asc" },
      include: { featureLimits: true },
    });
  },
};
