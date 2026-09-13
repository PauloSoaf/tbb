import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
export const sessionService = {
  async listUserSessions() {
    const ctx = await getWorkspaceContext();
    return prisma.userSession.findMany({ where: { userId: ctx.userId, workspaceId: ctx.workspaceId },
      select: { id: true, userAgent: true, status: true, createdAt: true, expiresAt: true }, orderBy: { createdAt: "desc" } });
  },
  async revokeSession(id: string) {
    const ctx = await getWorkspaceContext();
    const result = await prisma.userSession.updateMany({
      where: { id, workspaceId: ctx.workspaceId, userId: ctx.userId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
    if (!result.count) throw new Error("Sessão não encontrada.");
  },
};
