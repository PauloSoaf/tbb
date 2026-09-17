import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { PARTNER_SHAREABLE_MODULES, type PartnerModule } from "@/lib/tenancy/partnerModules";

export type InvitePreview =
  | { valid: false }
  | { valid: true; requesterWorkspaceName: string; requestedByName: string };

export async function getInvitePreview(token: string, viewerWorkspaceId: string): Promise<InvitePreview> {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const connection = await prisma.partnerConnection.findUnique({
    where: { inviteTokenHash: tokenHash },
    include: { requesterWorkspace: { select: { name: true } }, requestedByUser: { select: { name: true } } },
  });
  if (!connection || connection.status !== "PENDING" || connection.inviteExpiresAt! < new Date() || connection.requesterWorkspaceId === viewerWorkspaceId) {
    return { valid: false };
  }
  return { valid: true, requesterWorkspaceName: connection.requesterWorkspace.name, requestedByName: connection.requestedByUser.name };
}

export type PartnerSettingsData =
  | { state: "none" }
  | { state: "pending"; connectionId: string; expiresAt: string }
  | {
      state: "connected";
      connectionId: string;
      partnerWorkspaceName: string;
      partnerUserName: string;
      connectedSince: string;
      myPolicy: Record<PartnerModule, boolean>;
      partnerPolicy: Record<PartnerModule, boolean>;
    };

export async function getPartnerSettingsData(workspaceId: string): Promise<PartnerSettingsData> {
  const pending = await prisma.partnerConnection.findFirst({ where: { requesterWorkspaceId: workspaceId, status: "PENDING" } });
  if (pending) return { state: "pending", connectionId: pending.id, expiresAt: pending.inviteExpiresAt!.toISOString() };

  const connection = await prisma.partnerConnection.findFirst({
    where: { status: "ACCEPTED", OR: [{ requesterWorkspaceId: workspaceId }, { receiverWorkspaceId: workspaceId }] },
    include: {
      requesterWorkspace: { select: { id: true, name: true } },
      receiverWorkspace: { select: { id: true, name: true } },
      requestedByUser: { select: { name: true } },
      acceptedByUser: { select: { name: true } },
      sharingPolicies: true,
    },
  });
  if (!connection) return { state: "none" };

  const iAmRequester = connection.requesterWorkspaceId === workspaceId;
  const partnerWorkspace = iAmRequester ? connection.receiverWorkspace! : connection.requesterWorkspace;
  const partnerUser = iAmRequester ? connection.acceptedByUser! : connection.requestedByUser;
  const emptyPolicy = Object.fromEntries(PARTNER_SHAREABLE_MODULES.map((module) => [module, true])) as Record<PartnerModule, boolean>;
  const myPolicy = { ...emptyPolicy };
  const partnerPolicy = { ...emptyPolicy };
  for (const row of connection.sharingPolicies) {
    if (row.module in myPolicy) {
      if (row.ownerWorkspaceId === workspaceId) myPolicy[row.module as PartnerModule] = row.enabled;
      else partnerPolicy[row.module as PartnerModule] = row.enabled;
    }
  }
  return {
    state: "connected",
    connectionId: connection.id,
    partnerWorkspaceName: partnerWorkspace.name,
    partnerUserName: partnerUser.name,
    connectedSince: connection.acceptedAt!.toISOString(),
    myPolicy,
    partnerPolicy,
  };
}
