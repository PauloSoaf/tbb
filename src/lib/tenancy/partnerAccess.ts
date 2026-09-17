import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "./getCurrentTenantContext";
import { AuthorizationError } from "./requirePermission";
import type { PartnerModule } from "./partnerModules";

export async function getActivePartnerConnection(workspaceId: string) {
  return prisma.partnerConnection.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterWorkspaceId: workspaceId }, { receiverWorkspaceId: workspaceId }],
    },
  });
}

function partnerWorkspaceIdFor(connection: { requesterWorkspaceId: string; receiverWorkspaceId: string | null }, workspaceId: string) {
  return connection.requesterWorkspaceId === workspaceId ? connection.receiverWorkspaceId : connection.requesterWorkspaceId;
}

export async function getPartnerContext(module: PartnerModule) {
  const ctx = await getWorkspaceContext();
  const connection = await getActivePartnerConnection(ctx.workspaceId);
  if (!connection) return null;
  const partnerWorkspaceId = partnerWorkspaceIdFor(connection, ctx.workspaceId);
  if (!partnerWorkspaceId) return null;
  const policy = await prisma.partnerSharingPolicy.findUnique({
    where: { connectionId_ownerWorkspaceId_module: { connectionId: connection.id, ownerWorkspaceId: partnerWorkspaceId, module } },
  });
  if (!policy?.enabled) return null;
  return { ctx, connection, partnerWorkspaceId };
}

export async function requirePartnerContext(module: PartnerModule) {
  const result = await getPartnerContext(module);
  if (!result) throw new AuthorizationError("Este parceiro não compartilhou este módulo.");
  return result;
}
