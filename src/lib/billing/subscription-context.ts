import { prisma } from "@/lib/prisma";
import { billingPlanService, type PlanFeatureLimits } from "@/services/billingPlan.service";
import type { BillingStatus } from "@prisma/client";

export interface TenantSubscriptionContext {
  tenantId: string;
  planCode: string;
  status: BillingStatus;
  featureLimits: PlanFeatureLimits;
}

export class FeatureNotAvailableError extends Error {
  constructor(featureKey: string) {
    super(`Recurso "${featureKey}" não disponível no seu plano atual.`);
    this.name = "FeatureNotAvailableError";
  }
}

export class UsageLimitExceededError extends Error {
  limit: number;
  resourceKey: string;

  constructor(resourceKey: string, limit: number) {
    super(`Limite do plano atingido para "${resourceKey}" (máximo: ${limit}).`);
    this.name = "UsageLimitExceededError";
    this.resourceKey = resourceKey;
    this.limit = limit;
  }
}

/**
 * Resolves the current plan, billing status and feature/limit map for a tenant.
 * Tenants without an explicit TenantSubscription row default to the FREE plan/TRIAL status.
 * Non-expired `TenantFeatureOverride` rows win over the plan's own FeatureLimit —
 * used for manual exceptions (promotions, negotiated bumps) without a new plan.
 */
export async function getTenantSubscriptionContext(tenantId: string): Promise<TenantSubscriptionContext> {
  const subscription = await prisma.tenantSubscription.findUnique({ where: { tenantId }, include: { plan: true } });

  const planCode = subscription?.plan.code ?? "FREE";
  const status: BillingStatus = subscription?.status ?? "TRIAL";
  const featureLimits = await billingPlanService.getPlanFeatureLimits(planCode);

  // Isolated from the query above on purpose: `tenant_feature_overrides` ships in its own
  // migration, so this must degrade to "no overrides" (not throw) if that migration hasn't
  // reached this database yet — overrides are an enhancement, not a dependency for every
  // plan/limit check in the app.
  try {
    const overrides = await prisma.tenantFeatureOverride.findMany({ where: { tenantId } });
    const now = new Date();
    for (const override of overrides) {
      if (override.expiresAt && override.expiresAt < now) continue; // expired — plan limit applies
      featureLimits[override.key] = { limit: override.limit, enabled: override.enabled };
    }
  } catch (err) {
    console.error("[SUBSCRIPTION_CONTEXT] Failed to load tenant feature overrides (falling back to plan limits only):", err);
  }

  return { tenantId, planCode, status, featureLimits };
}

/**
 * Throws `FeatureNotAvailableError` if the tenant's plan does not enable `featureKey`.
 * A missing FeatureLimit row for the key is treated as "not enabled" (fail closed).
 */
export async function requireFeature(tenantId: string, featureKey: string): Promise<TenantSubscriptionContext> {
  const ctx = await getTenantSubscriptionContext(tenantId);
  const feature = ctx.featureLimits[featureKey];
  if (!feature || !feature.enabled) {
    throw new FeatureNotAvailableError(featureKey);
  }
  return ctx;
}
