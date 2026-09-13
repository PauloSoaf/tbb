import { prisma } from "@/lib/prisma";
export type { PlanFeatureLimits } from "@/lib/billing/subscription-context";
export const billingPlanService = {
  async listPlans() { return prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, include: { featureLimits: true } }); },
};
