import { prisma } from "@/lib/prisma";
import { auditLogService } from "@/services/audit-log.service";
import { subDays, subMonths, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { TenantSubscription, SubscriptionPlan, Nutritionist, BillingStatus, Prisma } from "@prisma/client";
import { storageUsageService } from "@/services/storageUsage.service";

const VALID_BILLING_STATUSES: readonly BillingStatus[] = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"];

function toBillingStatus(status: string): BillingStatus {
  return (VALID_BILLING_STATUSES as readonly string[]).includes(status)
    ? (status as BillingStatus)
    : "TRIAL";
}

export interface GlobalMetricsUIData {
  totalTenants: number;
  activeTenants: number;
  newTenantsLast30Days: number;
  totalPatients: number;
  totalTeamMembers: number;
  totalAppointments: number;
  totalAnamneses: number;
  totalSkinfoldAssessments: number;
  totalMealPlans: number;
  estimatedMrrCents: number;
  planBreakdown: { planCode: string; planName: string; count: number; priceCents: number; fill: string }[];
  subscriptionStatusBreakdown: { status: string; count: number; fill: string }[];
  monthlyGrowth: { month: string; tenants: number; patients: number; mrrCents: number }[];
  activityBreakdown: { name: string; count: number; fill: string }[];
  activeSessions: number;
  loginsLast7Days: number;
  deniedAccessLast30Days: number;
  sensitiveActionsLast30Days: number;
  openSecurityEvents: number;
  totalStorageBytes: number;
  totalStorageFiles: number;
  topStorageTenants: { tenantId: string; name: string; slug: string; sizeBytes: number; fileCount: number }[];
}

export interface TenantAdminUIData {
  id: string;
  slug: string;
  name: string;
  email: string;
  crn: string | null;
  city: string | null;
  state: string | null;
  createdAt: Date;
  updatedAt: Date;
  patientCount: number;
  teamMemberCount: number;
  planCode: string;
  planName: string;
  subscriptionStatus: string;
  priceCents: number;
  storageBytes: number;
  storageLimitMb: number | null;
}

const PLAN_COLORS: Record<string, string> = {
  FREE: "#64748b",   // slate-500
  BASIC: "#3b82f6",  // blue-500
  PRO: "#8b5cf6",    // purple-500
  CLINIC: "#10b981", // emerald-500
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#10b981", // emerald
  TRIAL: "#6366f1",  // indigo
  CANCELED: "#ef4444", // red
  PAST_DUE: "#f59e0b", // amber
};

export const globalAdminService = {
  async getGlobalMetrics(): Promise<GlobalMetricsUIData> {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const sevenDaysAgo = subDays(new Date(), 7);

    const [
      totalTenants,
      newTenantsLast30Days,
      totalPatients,
      totalTeamMembers,
      totalAppointments,
      totalAnamneses,
      totalSkinfoldAssessments,
      totalMealPlans,
      allSubscriptions,
      allPlans,
      allNutritionistDates,
      allPatientDates,
      activeSessions,
      loginsLast7Days,
      deniedAccessLast30Days,
      sensitiveActionsLast30Days,
      openSecurityEvents,
      storageOverview,
    ] = await Promise.all([
      prisma.nutritionist.count(),
      prisma.nutritionist.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.patient.count({ where: { status: "ACTIVE" } }),
      prisma.teamMember.count({ where: { isActive: true } }),
      prisma.appointment.count(),
      prisma.anamneseResponse.count(),
      prisma.skinfoldAssessment.count(),
      prisma.mealPlan.count(),
      prisma.tenantSubscription.findMany({
        include: { plan: true },
      }),
      prisma.subscriptionPlan.findMany(),
      prisma.nutritionist.findMany({ select: { createdAt: true } }),
      prisma.patient.findMany({ where: { status: "ACTIVE" }, select: { createdAt: true } }),
      prisma.userSession.count({ where: { status: "ACTIVE" } }),
      prisma.auditLog.count({ where: { action: "session.login", createdAt: { gte: sevenDaysAgo } } }),
      prisma.auditLog.count({ where: { result: "DENIED", createdAt: { gte: thirtyDaysAgo } } }),
      prisma.auditLog.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          OR: [
            { action: { contains: "delete" } },
            { action: { contains: "archive" } },
            { action: "session.revoke" },
            { action: "team.editPermissions" },
          ],
        },
      }),
      prisma.securityEvent.count({ where: { status: "OPEN" } }),
      storageUsageService.getGlobalStorageOverview(),
    ]);

    const subscribedTenantIds = new Set(allSubscriptions.map((s: TenantSubscription & { plan: SubscriptionPlan }) => s.tenantId));
    const unsubscribedCount = totalTenants - subscribedTenantIds.size;

    const freePlan = allPlans.find((p: SubscriptionPlan) => p.code === "FREE") || { code: "FREE", name: "NutriOpus Gratuito", priceCents: 0 };

    let estimatedMrrCents = 0;
    const planCountsMap = new Map<string, { planName: string; count: number; priceCents: number }>();
    const statusCountsMap = new Map<string, number>();

    for (const p of allPlans) {
      planCountsMap.set(p.code, { planName: p.name, count: 0, priceCents: p.priceCents });
    }
    if (!planCountsMap.has("FREE")) {
      planCountsMap.set("FREE", { planName: freePlan.name, count: 0, priceCents: 0 });
    }

    for (const sub of allSubscriptions) {
      const code = sub.plan.code;
      const entry = planCountsMap.get(code) || { planName: sub.plan.name, count: 0, priceCents: sub.plan.priceCents };
      entry.count += 1;
      planCountsMap.set(code, entry);

      const status = sub.status;
      statusCountsMap.set(status, (statusCountsMap.get(status) || 0) + 1);

      if (status === "ACTIVE" || status === "TRIAL") {
        estimatedMrrCents += sub.plan.priceCents;
      }
    }

    if (unsubscribedCount > 0) {
      const freeEntry = planCountsMap.get("FREE")!;
      freeEntry.count += unsubscribedCount;
      planCountsMap.set("FREE", freeEntry);
      statusCountsMap.set("TRIAL", (statusCountsMap.get("TRIAL") || 0) + unsubscribedCount);
    }

    const planBreakdown = Array.from(planCountsMap.entries()).map(([code, data]) => ({
      planCode: code,
      planName: data.planName,
      count: data.count,
      priceCents: data.priceCents,
      fill: PLAN_COLORS[code] || "#3b82f6",
    }));

    const subscriptionStatusBreakdown = Array.from(statusCountsMap.entries()).map(([status, count]) => ({
      status,
      count,
      fill: STATUS_COLORS[status] || "#64748b",
    }));

    // Calculate 6-month growth curve
    const now = new Date();
    const monthlyGrowth: { month: string; tenants: number; patients: number; mrrCents: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const refDate = subMonths(now, i);
      const endOfThisMonth = endOfMonth(refDate);
      const monthLabel = format(refDate, "MMM/yy", { locale: ptBR });

      const tenantsCount = allNutritionistDates.filter((n) => n.createdAt <= endOfThisMonth).length;
      const patientsCount = allPatientDates.filter((p) => p.createdAt <= endOfThisMonth).length;
      
      // Approximate MRR scaling proportionally to tenant count vs current total
      const ratio = totalTenants > 0 ? tenantsCount / totalTenants : 1;
      const monthMrr = Math.round(estimatedMrrCents * ratio);

      monthlyGrowth.push({
        month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        tenants: tenantsCount,
        patients: patientsCount,
        mrrCents: monthMrr,
      });
    }

    const activityBreakdown = [
      { name: "Consultas", count: totalAppointments, fill: "#3b82f6" },
      { name: "Anamneses", count: totalAnamneses, fill: "#8b5cf6" },
      { name: "Avaliações", count: totalSkinfoldAssessments, fill: "#10b981" },
      { name: "Planos Diet.", count: totalMealPlans, fill: "#f59e0b" },
    ];

    return {
      totalTenants,
      activeTenants: totalTenants,
      newTenantsLast30Days,
      totalPatients,
      totalTeamMembers,
      totalAppointments,
      totalAnamneses,
      totalSkinfoldAssessments,
      totalMealPlans,
      estimatedMrrCents,
      planBreakdown,
      subscriptionStatusBreakdown,
      monthlyGrowth,
      activityBreakdown,
      activeSessions,
      loginsLast7Days,
      deniedAccessLast30Days,
      sensitiveActionsLast30Days,
      openSecurityEvents,
      totalStorageBytes: storageOverview.totalBytes,
      totalStorageFiles: storageOverview.totalFiles,
      topStorageTenants: storageOverview.topTenants,
    };
  },

  async listTenants(
    search?: string,
    planCode?: string,
    page = 1,
    pageSize = 20
  ): Promise<{ data: TenantAdminUIData[]; total: number; totalPages: number; page: number }> {
    const where: Prisma.NutritionistWhereInput = {};
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { crn: { contains: q, mode: "insensitive" } },
      ];
    }

    if (planCode && planCode !== "ALL") {
      if (planCode === "FREE") {
        where.OR = [
          ...(where.OR || []),
          { subscription: { plan: { code: "FREE" } } },
          { subscription: null },
        ];
      } else {
        where.subscription = { plan: { code: planCode } };
      }
    }

    const [total, nutritionists] = await Promise.all([
      prisma.nutritionist.count({ where }),
      prisma.nutritionist.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: {
              patients: { where: { status: "ACTIVE" } },
              teamMembers: { where: { isActive: true } },
            },
          },
          subscription: {
            include: { plan: { include: { featureLimits: { where: { key: "storage.maxMb" } } } } },
          },
        },
      }),
    ]);

    type PlanWithStorageLimit = SubscriptionPlan & { featureLimits: { limit: number | null }[] };
    type NutritionistWithRelations = Nutritionist & {
      _count: { patients: number; teamMembers: number };
      subscription: (TenantSubscription & { plan: PlanWithStorageLimit }) | null;
    };

    const typedNutritionists = nutritionists as unknown as NutritionistWithRelations[];
    const storageByTenant = await prisma.storageFile.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: typedNutritionists.map((n) => n.id) } },
      _sum: { sizeBytes: true },
    });
    const storageBytesById = new Map(storageByTenant.map((s) => [s.tenantId, s._sum.sizeBytes ?? 0]));

    const freeStorageLimit = (await prisma.subscriptionPlan.findUnique({
      where: { code: "FREE" },
      include: { featureLimits: { where: { key: "storage.maxMb" } } },
    })) as PlanWithStorageLimit | null;

    const data: TenantAdminUIData[] = typedNutritionists.map((n) => {
      const plan = n.subscription?.plan || {
        code: "FREE",
        name: "NutriOpus Gratuito",
        priceCents: 0,
        featureLimits: freeStorageLimit?.featureLimits ?? [],
      };
      return {
        id: n.id,
        slug: n.slug,
        name: n.name,
        email: n.email,
        crn: n.crn,
        city: n.city,
        state: n.state,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        patientCount: n._count.patients,
        teamMemberCount: n._count.teamMembers,
        planCode: plan.code,
        planName: plan.name,
        subscriptionStatus: n.subscription?.status || "TRIAL",
        priceCents: plan.priceCents,
        storageBytes: storageBytesById.get(n.id) ?? 0,
        storageLimitMb: plan.featureLimits[0]?.limit ?? null,
      };
    });

    return {
      data,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
      page,
    };
  },

  async updateTenantPlan(
    tenantIdOrSlug: string,
    planCode: string,
    status: string,
    actor: { userId: string; name: string }
  ) {
    const nutritionist = await prisma.nutritionist.findFirst({
      where: {
        OR: [{ id: tenantIdOrSlug }, { slug: tenantIdOrSlug }],
      },
    });

    if (!nutritionist) {
      throw new Error("Clínica não encontrada.");
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { code: planCode },
    });

    if (!plan) {
      throw new Error(`Plano "${planCode}" não cadastrado.`);
    }

    const billingStatus = toBillingStatus(status);

    let subscription;
    try {
      subscription = await prisma.tenantSubscription.upsert({
        where: { tenantId: nutritionist.id },
        update: {
          planId: plan.id,
          status: billingStatus,
          updatedAt: new Date(),
        },
        create: {
          tenantId: nutritionist.id,
          planId: plan.id,
          status: billingStatus,
          trialStartedAt: new Date(),
        },
        include: { plan: true },
      });
    } catch (dbError) {
      const technicalReason = dbError instanceof Error ? dbError.message : "Erro desconhecido no banco de dados.";
      console.error("[GLOBAL_ADMIN] Failed to update tenant plan:", dbError);

      await auditLogService.record({
        tenantId: nutritionist.id,
        actor: {
          userId: actor.userId,
          name: `${actor.name} [GLOBAL_ADMIN]`,
          role: "GLOBAL_ADMIN",
        },
        action: "globalAdmin.plan.update",
        resource: "subscription",
        resourceId: nutritionist.id,
        result: "FAILURE",
        reason: `Falha ao alterar assinatura do tenant ${nutritionist.slug} para ${plan.code} (${status}): ${technicalReason}`,
      });

      throw new Error(
        "Não foi possível alterar o plano agora. Isso costuma acontecer quando o banco de dados está com uma migração pendente — contate o suporte técnico se persistir."
      );
    }

    await auditLogService.record({
      tenantId: nutritionist.id,
      actor: {
        userId: actor.userId,
        name: `${actor.name} [GLOBAL_ADMIN]`,
        role: "GLOBAL_ADMIN",
      },
      action: "globalAdmin.plan.update",
      resource: "subscription",
      resourceId: subscription.id,
      result: "SUCCESS",
      changedFields: ["planId", "status"],
      reason: `Assinatura do tenant ${nutritionist.slug} alterada para ${plan.code} (${status}) por Global Admin`,
    });

    return subscription;
  },

  async listGlobalAuditLogs(page = 1, pageSize = 30) {
    const [total, data] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: data.map((evt) => ({
        id: evt.id,
        tenantId: evt.tenantId,
        actorUserId: evt.actorUserId,
        actorNameSnapshot: evt.actorNameSnapshot,
        actorRoleSnapshot: evt.actorRoleSnapshot,
        action: evt.action,
        resource: evt.resource,
        resourceId: evt.resourceId,
        patientNameSnapshot: evt.patientNameSnapshot,
        result: evt.result,
        reason: evt.reason,
        createdAt: evt.createdAt,
        ipHash: evt.ipHash,
      })),
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
      page,
    };
  },
};
