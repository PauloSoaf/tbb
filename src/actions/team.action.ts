"use server";

import { requirePermission, AuthorizationError } from "@/lib/tenancy/requirePermission";
import { auditLogService } from "@/services/audit-log.service";
import { headers } from "next/headers";
import {
  getTeamMembers, getPendingInvites, createTeamInvite, revokeTeamInvite,
  updateTeamMemberRole, removeTeamMember, acceptTeamInvite,
} from "@/services/team.service";
import { sendTeamInviteEmail } from "@/services/email.service";
import { prisma } from "@/lib/prisma";
import type { TeamMemberRole } from "@prisma/client";
import { invalidateTeam } from "@/lib/cache/invalidate-nutriopus-cache";
import { usageLimitService } from "@/services/usageLimit.service";

export async function getTeamMembersAction(tenantSlug: string) {
  let ctx;
  try {
    ctx = await requirePermission("team", "view", tenantSlug, { throwOnFailure: true });
  } catch {
    return { members: [], invites: [], error: "Não autorizado" };
  }
  const session = ctx.session;
  try {
    const [members, invites] = await Promise.all([
      getTeamMembers(session.nutritionistId),
      getPendingInvites(session.nutritionistId),
    ]);
    return { members, invites };
  } catch (e) { return { members: [], invites: [], error: e instanceof Error ? e.message : "Erro" }; }
}

export async function inviteTeamMemberAction(tenantSlug: string, email: string, role: TeamMemberRole) {
  let ctx;
  try {
    ctx = await requirePermission("team", "invite", tenantSlug, { throwOnFailure: true });
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    return { error: "Não autorizado." };
  }
  const session = ctx.session;
  try {
    const currentTeamCount = await prisma.teamMember.count({
      where: { nutritionistId: session.nutritionistId, isActive: true },
    });
    const limitCheck = await usageLimitService.checkEntityLimit(
      session.nutritionistId,
      "team.max",
      currentTeamCount
    );
    if (!limitCheck.allowed) {
      return {
        error: `Limite de ${limitCheck.limit} membro(s) de equipe do seu plano atual foi atingido. Faça upgrade do plano para convidar mais pessoas.`,
      };
    }

    const invite = await createTeamInvite(session.nutritionistId, email, role);
    invalidateTeam({ nutritionistId: session.nutritionistId, tenant: tenantSlug });
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${origin}/convite/${invite.token}`;

    const nut = await prisma.nutritionist.findUnique({ where: { id: session.nutritionistId } });
    if (nut) {
      await sendTeamInviteEmail(email, inviteUrl, nut.name);
    }

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || undefined;

    await auditLogService.record({
      tenantId: session.nutritionistId,
      actor: {
        userId: ctx.userId,
        teamMemberId: ctx.teamMemberId,
        name: ctx.isGlobalAdmin ? "Global Admin" : ctx.nutritionist.name,
        role: ctx.role,
      },
      action: "team.invite.create",
      resource: "team",
      resourceId: invite.id,
      resourceLabelSnapshot: email,
      result: "SUCCESS",
      changedFields: ["email", "role"],
      requestContext: { ip, userAgent },
    });

    return { invite, inviteUrl };
  } catch (e) { return { error: e instanceof Error ? e.message : "Erro ao convidar." }; }
}

export async function revokeInviteAction(tenantSlug: string, inviteId: string) {
  let ctx;
  try {
    ctx = await requirePermission("team", "invite", tenantSlug, { throwOnFailure: true });
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    return { error: "Não autorizado." };
  }
  const session = ctx.session;
  try {
    await revokeTeamInvite(session.nutritionistId, inviteId);
    invalidateTeam({ nutritionistId: session.nutritionistId, tenant: tenantSlug });

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || undefined;

    await auditLogService.record({
      tenantId: session.nutritionistId,
      actor: {
        userId: ctx.userId,
        teamMemberId: ctx.teamMemberId,
        name: ctx.isGlobalAdmin ? "Global Admin" : ctx.nutritionist.name,
        role: ctx.role,
      },
      action: "team.invite.revoke",
      resource: "team",
      resourceId: inviteId,
      result: "SUCCESS",
      requestContext: { ip, userAgent },
    });

    return { success: true };
  } catch (e) { return { error: e instanceof Error ? e.message : "Erro ao revogar." }; }
}

export async function updateMemberRoleAction(tenantSlug: string, memberId: string, role: TeamMemberRole) {
  let ctx;
  try {
    ctx = await requirePermission("team", "editPermissions", tenantSlug, { throwOnFailure: true });
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    return { error: "Não autorizado." };
  }
  const session = ctx.session;
  try {
    const member = await updateTeamMemberRole(session.nutritionistId, memberId, role);
    invalidateTeam({ nutritionistId: session.nutritionistId, tenant: tenantSlug });

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || undefined;

    await auditLogService.record({
      tenantId: session.nutritionistId,
      actor: {
        userId: ctx.userId,
        teamMemberId: ctx.teamMemberId,
        name: ctx.isGlobalAdmin ? "Global Admin" : ctx.nutritionist.name,
        role: ctx.role,
      },
      action: "team.role.update",
      resource: "team",
      resourceId: memberId,
      resourceLabelSnapshot: member.name,
      result: "SUCCESS",
      changedFields: ["role"],
      requestContext: { ip, userAgent },
    });

    return { member };
  } catch (e) { return { error: e instanceof Error ? e.message : "Erro ao atualizar cargo." }; }
}

export async function removeMemberAction(tenantSlug: string, memberId: string) {
  let ctx;
  try {
    ctx = await requirePermission("team", "removeMember", tenantSlug, { throwOnFailure: true });
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    return { error: "Não autorizado." };
  }
  const session = ctx.session;
  try {
    await removeTeamMember(session.nutritionistId, memberId);
    invalidateTeam({ nutritionistId: session.nutritionistId, tenant: tenantSlug });

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || undefined;

    await auditLogService.record({
      tenantId: session.nutritionistId,
      actor: {
        userId: ctx.userId,
        teamMemberId: ctx.teamMemberId,
        name: ctx.isGlobalAdmin ? "Global Admin" : ctx.nutritionist.name,
        role: ctx.role,
      },
      action: "team.member.remove",
      resource: "team",
      resourceId: memberId,
      result: "SUCCESS",
      requestContext: { ip, userAgent },
    });

    return { success: true };
  } catch (e) { return { error: e instanceof Error ? e.message : "Erro ao remover." }; }
}

export async function acceptInviteAction(token: string, name: string) {
  try {
    const member = await acceptTeamInvite(token, name);
    return { success: true, member };
  } catch (e) { return { error: e instanceof Error ? e.message : "Erro ao aceitar convite." }; }
}
