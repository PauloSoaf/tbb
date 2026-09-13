import { prisma } from "@/lib/prisma";
import type { PermissionEffect, TeamMemberRole } from "@prisma/client";

export interface PermissionCatalogItem {
  id: string;
  key: string;
  resource: string;
  action: string;
  description: string;
}

export interface MemberPermissionsData {
  memberId: string;
  role: TeamMemberRole;
  rolePermissions: string[]; // keys enabled by role
  overrides: {
    permissionId: string;
    key: string;
    effect: PermissionEffect;
  }[];
  effectivePermissions: string[]; // final set of keys
}

export const permissionService = {
  /**
   * Returns the catalog of all available permissions grouped or listed.
   */
  async getAllPermissions(): Promise<PermissionCatalogItem[]> {
    return await prisma.permission.findMany({
      orderBy: [{ resource: "asc" }, { action: "asc" }],
    });
  },

  /**
   * Resolves a team member's current role permissions, custom overrides, and effective permissions.
   */
  async getMemberPermissions(
    nutritionistId: string,
    memberId: string
  ): Promise<MemberPermissionsData | null> {
    const member = await prisma.teamMember.findFirst({
      where: { id: memberId, nutritionistId },
    });
    if (!member) return null;

    const allPerms = await prisma.permission.findMany();
    const permMap = new Map(allPerms.map((p) => [p.id, p]));

    // 1. Role permissions
    const rolePermRecords = await prisma.rolePermission.findMany({
      where: {
        role: member.role,
        OR: [{ tenantId: nutritionistId }, { tenantId: null }],
      },
      include: { permission: true },
    });

    const rolePermissionsSet = new Set<string>();
    rolePermRecords.forEach((rp) => {
      if (rp.enabled) {
        rolePermissionsSet.add(rp.permission.key);
      }
    });

    // 2. Member overrides
    const overridesRecords = await prisma.memberPermissionOverride.findMany({
      where: { teamMemberId: memberId },
      include: { permission: true },
    });

    const overridesList = overridesRecords.map((ov) => ({
      permissionId: ov.permissionId,
      key: ov.permission.key,
      effect: ov.effect,
    }));

    // 3. Calculate effective permissions
    const effectiveSet = new Set<string>(rolePermissionsSet);

    if (member.role === "OWNER") {
      allPerms.forEach((p) => effectiveSet.add(p.key));
    } else {
      overridesList.forEach((ov) => {
        if (ov.effect === "ALLOW") {
          effectiveSet.add(ov.key);
        } else if (ov.effect === "DENY") {
          effectiveSet.delete(ov.key);
        }
      });
    }

    return {
      memberId: member.id,
      role: member.role,
      rolePermissions: Array.from(rolePermissionsSet),
      overrides: overridesList,
      effectivePermissions: Array.from(effectiveSet),
    };
  },

  /**
   * Replaces all permission overrides for a given team member.
   */
  async setMemberOverrides(
    nutritionistId: string,
    memberId: string,
    overrides: { permissionId: string; effect: PermissionEffect }[]
  ) {
    // Verify member belongs to this tenant
    const member = await prisma.teamMember.findFirst({
      where: { id: memberId, nutritionistId },
    });
    if (!member) {
      throw new Error("Membro não encontrado na clínica.");
    }

    // Transaction: delete existing overrides for member and create new ones
    return await prisma.$transaction(async (tx) => {
      await tx.memberPermissionOverride.deleteMany({
        where: { teamMemberId: memberId },
      });

      if (overrides.length > 0) {
        await tx.memberPermissionOverride.createMany({
          data: overrides.map((ov) => ({
            teamMemberId: memberId,
            permissionId: ov.permissionId,
            effect: ov.effect,
          })),
        });
      }

      return await tx.memberPermissionOverride.findMany({
        where: { teamMemberId: memberId },
        include: { permission: true },
      });
    });
  },
};
