import { cache } from "react";
import { getSessionFromCookies } from "@/lib/auth/cookies";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth/session";
import type { Nutritionist, TeamMemberRole } from "@prisma/client";

export interface TenantContext {
  session: SessionPayload;
  nutritionist: Nutritionist;
  userId: string;
  nutritionistId: string;
  slug: string;
  role: string;
  teamMemberRole: TeamMemberRole | null;
  teamMemberId: string | null;
  permissions: Set<string>;
  isGlobalAdmin: boolean;
  isOwner: boolean;
}

/**
 * Resolves full tenant security context for the current authenticated user inside `tenantSlug`.
 * Wrapped in React.cache so multiple calls per request are memoized.
 */
export const getCurrentTenantContext = cache(
  async (tenantSlug?: string): Promise<TenantContext | null> => {
    const session = await getSessionFromCookies();
    if (!session) return null;

    // Check Global Admin status
    const isGlobalAdmin = session.role === "GLOBAL_ADMIN";

    // If tenantSlug is provided, verify session matches or if user is global admin
    const targetSlug = tenantSlug || session.nutritionistSlug;
    if (session.nutritionistSlug !== targetSlug && !isGlobalAdmin) {
      return null;
    }

    const nutritionist = await prisma.nutritionist.findUnique({
      where: { slug: targetSlug },
    });
    if (!nutritionist) return null;

    // Try to find if the user is a team member for this tenant
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        nutritionistId: nutritionist.id,
        OR: [
          { userId: session.userId },
          { email: session.userId }, // fallback if userId right after migration
        ],
        isActive: true,
      },
    });

    const isOwner =
      session.role === "OWNER" ||
      session.role === "NUTRITIONIST" ||
      teamMember?.role === "OWNER";

    // Resolve permissions
    const permissions = new Set<string>();

    if (isGlobalAdmin || isOwner) {
      // Owner and Global Admin have all permissions by default
      const allPermissions = await prisma.permission.findMany({
        select: { key: true },
      });
      allPermissions.forEach((p) => permissions.add(p.key));
    } else if (teamMember) {
      // 1. Get role permissions (tenant-specific overrides take precedence over system defaults)
      const rolePerms = await prisma.rolePermission.findMany({
        where: {
          role: teamMember.role,
          OR: [{ tenantId: nutritionist.id }, { tenantId: null }],
        },
        include: { permission: true },
      });

      rolePerms.forEach((rp) => {
        if (rp.enabled) {
          permissions.add(rp.permission.key);
        }
      });

      // 2. Apply member-specific overrides
      const overrides = await prisma.memberPermissionOverride.findMany({
        where: { teamMemberId: teamMember.id },
        include: { permission: true },
      });

      overrides.forEach((ov) => {
        if (ov.effect === "ALLOW") {
          permissions.add(ov.permission.key);
        } else if (ov.effect === "DENY") {
          permissions.delete(ov.permission.key);
        }
      });
    }

    return {
      session,
      nutritionist,
      userId: session.userId,
      nutritionistId: nutritionist.id,
      slug: nutritionist.slug,
      role: session.role,
      teamMemberRole: teamMember?.role || null,
      teamMemberId: teamMember?.id || null,
      permissions,
      isGlobalAdmin,
      isOwner,
    };
  }
);
