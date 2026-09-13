import { prisma } from "@/lib/prisma";
import { auditLogService } from "@/services/audit-log.service";
import type { SessionStatus } from "@prisma/client";

export interface SessionUIData {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  status: SessionStatus;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  ipHash: string | null;
  lastSeenAt: Date;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  isCurrentSession?: boolean;
}

export const sessionService = {
  /**
   * List active/recent sessions for a specific user.
   */
  async listUserSessions(userId: string, currentSessionTokenHash?: string): Promise<SessionUIData[]> {
    const sessions = await prisma.userSession.findMany({
      where: { userId },
      orderBy: { lastSeenAt: "desc" },
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      userName: s.user.name,
      userEmail: s.user.email,
      userRole: s.user.role,
      status: s.status,
      deviceType: s.deviceType || "PC / Dispositivo",
      browser: s.browser || "Navegador Web",
      os: s.os || "Sistema Operacional",
      ipHash: s.ipHash,
      lastSeenAt: s.lastSeenAt,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      revokedAt: s.revokedAt,
      isCurrentSession: currentSessionTokenHash ? s.sessionTokenHash === currentSessionTokenHash : false,
    }));
  },

  /**
   * List active/recent sessions across the entire tenant team.
   */
  async listTenantSessions(tenantId: string, currentSessionTokenHash?: string): Promise<SessionUIData[]> {
    const sessions = await prisma.userSession.findMany({
      where: { tenantId },
      orderBy: { lastSeenAt: "desc" },
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      userName: s.user.name,
      userEmail: s.user.email,
      userRole: s.user.role,
      status: s.status,
      deviceType: s.deviceType || "PC / Dispositivo",
      browser: s.browser || "Navegador Web",
      os: s.os || "Sistema Operacional",
      ipHash: s.ipHash,
      lastSeenAt: s.lastSeenAt,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      revokedAt: s.revokedAt,
      isCurrentSession: currentSessionTokenHash ? s.sessionTokenHash === currentSessionTokenHash : false,
    }));
  },

  /**
   * Revoke a session. Users can revoke own session (`sessions.revokeOwn`), or team session if permitted (`sessions.revokeTeam`).
   */
  async revokeSession(
    tenantId: string,
    actor: { userId: string; teamMemberId?: string | null; name: string; role: string },
    targetSessionId: string,
    canRevokeTeam: boolean
  ) {
    const targetSession = await prisma.userSession.findUnique({
      where: { id: targetSessionId },
      include: { user: true },
    });

    if (!targetSession) {
      throw new Error("Sessão não encontrada.");
    }

    const isOwnSession = targetSession.userId === actor.userId;
    if (!isOwnSession && !canRevokeTeam) {
      throw new Error("Não autorizado a revogar sessões de outros membros da equipe.");
    }

    const updated = await prisma.userSession.update({
      where: { id: targetSessionId },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
    });

    await auditLogService.record({
      tenantId,
      actor: {
        userId: actor.userId,
        teamMemberId: actor.teamMemberId,
        name: actor.name,
        role: actor.role,
      },
      action: "session.revoke",
      resource: "session",
      resourceId: targetSession.id,
      resourceLabelSnapshot: targetSession.user.email,
      result: "SUCCESS",
      changedFields: ["status", "revokedAt"],
      reason: isOwnSession ? "Sessão própria revogada pelo usuário" : `Sessão de membro ${targetSession.user.name} revogada remotamente`,
    });

    return updated;
  },
};
