import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import type { TeamMemberRole } from "@prisma/client";

const INVITE_TTL_DAYS = 7;

export async function getTeamMembers(nutritionistId: string) {
  return prisma.teamMember.findMany({
    where: { nutritionistId },
    orderBy: [{ role: "asc" }, { joinedAt: "desc" }],
  });
}

export async function getPendingInvites(nutritionistId: string) {
  return prisma.teamInvite.findMany({
    where: { nutritionistId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTeamInvite(nutritionistId: string, email: string, role: TeamMemberRole = "VIEWER") {
  const existing = await prisma.teamMember.findFirst({ where: { nutritionistId, email } });
  if (existing) throw new Error("Usuário já é membro da equipe.");

  const active = await prisma.teamInvite.findFirst({ where: { nutritionistId, email, status: "PENDING" } });
  if (active) await prisma.teamInvite.update({ where: { id: active.id }, data: { status: "REVOKED" } });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  return prisma.teamInvite.create({ data: { nutritionistId, email, role, token, expiresAt } });
}

export async function revokeTeamInvite(nutritionistId: string, inviteId: string) {
  const inv = await prisma.teamInvite.findFirst({ where: { id: inviteId, nutritionistId } });
  if (!inv) throw new Error("Convite não encontrado.");
  return prisma.teamInvite.update({ where: { id: inviteId }, data: { status: "REVOKED" } });
}

export async function updateTeamMemberRole(nutritionistId: string, memberId: string, role: TeamMemberRole) {
  const m = await prisma.teamMember.findFirst({ where: { id: memberId, nutritionistId } });
  if (!m) throw new Error("Membro não encontrado.");
  return prisma.teamMember.update({ where: { id: memberId }, data: { role } });
}

export async function removeTeamMember(nutritionistId: string, memberId: string) {
  const m = await prisma.teamMember.findFirst({ where: { id: memberId, nutritionistId } });
  if (!m) throw new Error("Membro não encontrado.");
  return prisma.teamMember.delete({ where: { id: memberId } });
}

export async function acceptTeamInvite(token: string, memberName: string) {
  const inv = await prisma.teamInvite.findFirst({
    where: { token, status: "PENDING" },
  });
  if (!inv) throw new Error("Convite inválido ou expirado.");
  if (inv.expiresAt < new Date()) {
    await prisma.teamInvite.update({ where: { id: inv.id }, data: { status: "EXPIRED" } });
    throw new Error("Convite expirado.");
  }

  const member = await prisma.teamMember.create({
    data: { nutritionistId: inv.nutritionistId, email: inv.email, name: memberName, role: inv.role },
  });

  await prisma.teamInvite.update({
    where: { id: inv.id },
    data: { status: "ACCEPTED", acceptedAt: new Date(), teamMemberId: member.id },
  });

  return member;
}

export async function getInviteByToken(token: string) {
  return prisma.teamInvite.findFirst({
    where: { token, status: "PENDING" },
    include: { nutritionist: { select: { name: true, slug: true } } },
  });
}
