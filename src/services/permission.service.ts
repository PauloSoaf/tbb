import { prisma } from "@/lib/prisma";
import { requirePermission, AuthorizationError } from "@/lib/tenancy/requirePermission";
import type { PermissionEffect } from "@prisma/client";
export const permissionService = {
  async setMemberOverrides(memberId: string, overrides: { permissionId: string; effect: PermissionEffect }[]) {
    const ctx = await requirePermission("permissions.manage");
    const member = await prisma.membership.findFirst({ where: { id: memberId, workspaceId: ctx.workspaceId } });
    if (!member || member.role === "OWNER") throw new AuthorizationError();
    return prisma.$transaction(async (tx) => {
      await tx.memberPermissionOverride.deleteMany({ where: { membershipId: member.id } });
      if (overrides.length) await tx.memberPermissionOverride.createMany({ data: overrides.map((item) => ({ ...item, membershipId: member.id })) });
    });
  },
};
