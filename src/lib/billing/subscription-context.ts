import { prisma } from "@/lib/prisma";
export type PlanFeatureLimits = Record<string, { limit: number | null; enabled: boolean }>;
export class FeatureNotAvailableError extends Error {
  constructor(key: string) { super(`Recurso indisponível na assinatura: ${key}`); this.name = "FeatureNotAvailableError"; }
}
export class UsageLimitExceededError extends Error {
  constructor(public resourceKey: string, public limit: number) { super(`Limite de uso atingido: ${resourceKey} (${limit}).`); }
}
export async function getWorkspaceSubscriptionContext(workspaceId: string) {
  const [subscription, overrides] = await Promise.all([
    prisma.workspaceSubscription.findUnique({ where: { workspaceId }, include: { plan: { include: { featureLimits: true } } } }),
    prisma.workspaceFeatureOverride.findMany({ where: { workspaceId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }),
  ]);
  const featureLimits: PlanFeatureLimits = {};
  for (const feature of subscription?.plan.featureLimits ?? []) featureLimits[feature.key] = { limit: feature.limit, enabled: feature.enabled };
  for (const override of overrides) featureLimits[override.key] = { limit: override.limit, enabled: override.enabled };
  return { workspaceId, planCode: subscription?.plan.code ?? null, status: subscription?.status ?? null,
    active: !!subscription?.plan.isActive && ["ACTIVE", "TRIAL"].includes(subscription.status), featureLimits };
}
export async function requireFeature(workspaceId: string, featureKey: string) {
  const ctx = await getWorkspaceSubscriptionContext(workspaceId);
  if (!ctx.active || !ctx.featureLimits[featureKey]?.enabled) throw new FeatureNotAvailableError(featureKey);
  return ctx;
}
