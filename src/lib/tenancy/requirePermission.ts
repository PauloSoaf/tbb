import { redirect } from "next/navigation";
import { getCurrentTenantContext, type TenantContext } from "./getCurrentTenantContext";
import { getSessionFromCookies } from "@/lib/auth/cookies";
import { prisma } from "@/lib/prisma";
import { auditLogService } from "@/services/audit-log.service";

export class AuthorizationError extends Error {
  constructor(message = "Acesso negado") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Ensures user is authenticated. Returns session payload or redirects/throws.
 */
export async function requireAuth(options?: { throwOnFailure?: boolean }) {
  const session = await getSessionFromCookies();
  if (!session) {
    if (options?.throwOnFailure) {
      throw new AuthorizationError("Sessão expirada ou não autenticado.");
    }
    redirect("/login");
  }
  return session;
}

/**
 * Ensures user has access to the specified tenant ID (nutritionistId or slug).
 */
export async function requireTenantAccess(
  tenantSlugOrId: string,
  options?: { throwOnFailure?: boolean }
): Promise<TenantContext> {
  const ctx = await getCurrentTenantContext(tenantSlugOrId);
  if (!ctx) {
    if (options?.throwOnFailure) {
      throw new AuthorizationError("Acesso negado a este tenant.");
    }
    redirect("/login");
  }
  return ctx;
}

/**
 * Ensures current user has permission for (resource, action) inside the target tenant.
 */
export async function requirePermission(
  resource: string,
  action: string,
  tenantSlugOrId?: string,
  options?: { throwOnFailure?: boolean }
): Promise<TenantContext> {
  const ctx = await getCurrentTenantContext(tenantSlugOrId);
  if (!ctx) {
    if (options?.throwOnFailure) {
      throw new AuthorizationError("Não autenticado no tenant.");
    }
    redirect("/login");
  }

  if (ctx.isGlobalAdmin || ctx.isOwner) {
    return ctx;
  }

  const permissionKey = `${resource}.${action}`;
  if (!ctx.permissions.has(permissionKey)) {
    try {
      await auditLogService.record({
        tenantId: ctx.nutritionistId,
        actor: {
          userId: ctx.userId,
          teamMemberId: ctx.teamMemberId,
          name: ctx.isGlobalAdmin ? "Global Admin" : ctx.nutritionist.name,
          role: ctx.role,
        },
        action: "permission.denied",
        resource,
        resourceId: tenantSlugOrId || ctx.slug || "N/A",
        result: "DENIED",
        reason: `Permissão negada para ${permissionKey}`,
      });
    } catch {
      // Ignore logging errors on denial
    }

    if (options?.throwOnFailure) {
      throw new AuthorizationError(`Permissão negada para ${permissionKey}.`);
    }
    redirect(`/dashboard/${ctx.slug}`);
  }

  return ctx;
}

/**
 * Ensures current user has the GLOBAL_ADMIN role.
 */
export async function requireGlobalAdmin(options?: { throwOnFailure?: boolean }) {
  const session = await getSessionFromCookies();
  if (!session) {
    if (options?.throwOnFailure) {
      throw new AuthorizationError("Acesso restrito à administração global do SaaS.");
    }
    redirect("/login");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      role: true,
      nutritionistId: true,
      nutritionist: { select: { slug: true } },
    },
  });

  if (!user || user.role !== "GLOBAL_ADMIN") {
    if (options?.throwOnFailure) {
      throw new AuthorizationError("Acesso restrito a administracao global do SaaS.");
    }
    redirect(`/dashboard/${session.nutritionistSlug}`);
  }

  return {
    ...session,
    nutritionistId: user.nutritionistId,
    nutritionistSlug: user.nutritionist.slug,
    role: user.role,
  };
}

/**
 * Checks if current user can view a specific patient.
 */
export async function canAccessPatient(patientId: string): Promise<boolean> {
  const ctx = await getCurrentTenantContext();
  if (!ctx) return false;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { nutritionistId: true },
  });

  if (!patient || patient.nutritionistId !== ctx.nutritionistId) {
    return false;
  }

  if (ctx.isOwner || ctx.isGlobalAdmin) return true;
  return ctx.permissions.has("patients.view");
}

/**
 * Checks if current user can mutate (create, edit, delete) a specific patient.
 */
export async function canMutatePatient(patientId: string): Promise<boolean> {
  const ctx = await getCurrentTenantContext();
  if (!ctx) return false;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { nutritionistId: true },
  });

  if (!patient || patient.nutritionistId !== ctx.nutritionistId) {
    return false;
  }

  if (ctx.isOwner || ctx.isGlobalAdmin) return true;
  return ctx.permissions.has("patients.edit");
}

/**
 * Asserts that an entity's tenantId matches the current user's active tenantId.
 */
export async function assertTenantOwnership(
  entityTenantId: string,
  options?: { throwOnFailure?: boolean }
): Promise<void> {
  const ctx = await getCurrentTenantContext();
  if (!ctx || ctx.nutritionistId !== entityTenantId) {
    if (options?.throwOnFailure) {
      throw new AuthorizationError("Recurso não pertence ao seu tenant.");
    }
    redirect("/login");
  }
}
