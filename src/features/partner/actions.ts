"use server";

import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy/requirePermission";
import { getActivePartnerConnection } from "@/lib/tenancy/partnerAccess";
import { PARTNER_SHAREABLE_MODULES, isPartnerModule } from "@/lib/tenancy/partnerModules";
import { allowAttempt } from "@/actions/auth";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
function failure(error: unknown) {
  if (error instanceof z.ZodError) return { error: error.issues[0]?.message || "Confira os campos." };
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return { error: error.code === "P2002" ? "Já existe um registro com esses dados." : "Não foi possível salvar. Atualize a página e tente novamente." };
  }
  return { error: error instanceof Error ? error.message : "Não foi possível concluir a operação." };
}
function invalidate() {
  revalidatePath("/settings", "page");
  revalidatePath("/finance", "layout");
}
async function log(tx: Prisma.TransactionClient, ctx: { workspaceId: string; userId: string }, type: string, entityId: string, metadata: Prisma.InputJsonValue = {}) {
  await tx.activityEvent.create({ data: { workspaceId: ctx.workspaceId, actorUserId: ctx.userId, type, entityType: "PartnerConnection", entityId, metadata, source: "SYSTEM" } });
}

export async function createPartnerInvite() {
  const ctx = await requirePermission("WRITE");
  try {
    if (await getActivePartnerConnection(ctx.workspaceId)) return { error: "Este workspace já está conectado a um parceiro." };
    if (!(await allowAttempt("partner-invite", ctx.workspaceId, 5))) return { error: "Muitos convites gerados. Aguarde 15 minutos e tente novamente." };
    const token = randomBytes(32).toString("base64url");
    const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_MS);
    await prisma.$transaction(async (tx) => {
      await tx.partnerConnection.updateMany({
        where: { requesterWorkspaceId: ctx.workspaceId, status: "PENDING" },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
      const created = await tx.partnerConnection.create({
        data: { requesterWorkspaceId: ctx.workspaceId, requestedByUserId: ctx.userId, status: "PENDING", inviteTokenHash: hashToken(token), inviteExpiresAt },
      });
      await log(tx, ctx, "partner.invited", created.id);
      return created;
    });
    invalidate();
    return { success: "Convite gerado.", token, expiresAt: inviteExpiresAt.toISOString() };
  } catch (error) {
    return failure(error);
  }
}

export async function revokePartnerInvite() {
  const ctx = await requirePermission("WRITE");
  try {
    const pending = await prisma.partnerConnection.findFirst({ where: { requesterWorkspaceId: ctx.workspaceId, status: "PENDING" } });
    if (!pending) return { error: "Não há convite pendente para cancelar." };
    await prisma.$transaction(async (tx) => {
      await tx.partnerConnection.update({ where: { id: pending.id }, data: { status: "REVOKED", revokedAt: new Date(), inviteTokenHash: null } });
      await log(tx, ctx, "partner.revoked", pending.id);
    });
    invalidate();
    return { success: "Convite cancelado." };
  } catch (error) {
    return failure(error);
  }
}

export async function acceptPartnerInvite(token: string) {
  const ctx = await requirePermission("WRITE");
  try {
    const connection = await prisma.partnerConnection.findUnique({ where: { inviteTokenHash: hashToken(token) } });
    if (!connection || connection.status !== "PENDING" || connection.inviteExpiresAt! < new Date()) {
      return { error: "Este convite não é mais válido." };
    }
    if (connection.requesterWorkspaceId === ctx.workspaceId) return { error: "Você não pode aceitar seu próprio convite." };
    if (await getActivePartnerConnection(ctx.workspaceId)) return { error: "Seu workspace já está conectado a um parceiro." };
    if (await getActivePartnerConnection(connection.requesterWorkspaceId)) return { error: "Este convite não é mais válido." };
    await prisma.$transaction(async (tx) => {
      const updated = await tx.partnerConnection.update({
        where: { id: connection.id },
        data: { receiverWorkspaceId: ctx.workspaceId, acceptedByUserId: ctx.userId, status: "ACCEPTED", acceptedAt: new Date(), inviteTokenHash: null },
      });
      await tx.partnerSharingPolicy.createMany({
        data: PARTNER_SHAREABLE_MODULES.flatMap((module) => [
          { connectionId: updated.id, ownerWorkspaceId: updated.requesterWorkspaceId, module, enabled: true },
          { connectionId: updated.id, ownerWorkspaceId: ctx.workspaceId, module, enabled: true },
        ]),
      });
      await log(tx, ctx, "partner.accepted", updated.id);
    });
    invalidate();
    return { success: "Conexão aceita." };
  } catch (error) {
    return failure(error);
  }
}

export async function declinePartnerInvite(token: string) {
  const ctx = await requirePermission("WRITE");
  try {
    const connection = await prisma.partnerConnection.findUnique({ where: { inviteTokenHash: hashToken(token) } });
    if (!connection || connection.status !== "PENDING") return { error: "Este convite não é mais válido." };
    await prisma.$transaction(async (tx) => {
      await tx.partnerConnection.update({ where: { id: connection.id }, data: { status: "DECLINED", inviteTokenHash: null } });
      await log(tx, ctx, "partner.declined", connection.id);
    });
    return { success: "Convite recusado." };
  } catch (error) {
    return failure(error);
  }
}

export async function disconnectPartner() {
  const ctx = await requirePermission("WRITE");
  try {
    const connection = await getActivePartnerConnection(ctx.workspaceId);
    if (!connection) return { error: "Nenhuma conexão ativa." };
    await prisma.$transaction(async (tx) => {
      await tx.partnerConnection.update({ where: { id: connection.id }, data: { status: "REVOKED", revokedAt: new Date() } });
      await log(tx, ctx, "partner.revoked", connection.id);
    });
    invalidate();
    return { success: "Conexão encerrada. Nenhum dado foi apagado." };
  } catch (error) {
    return failure(error);
  }
}

export async function updatePartnerSharingPolicy(module: string, enabled: boolean) {
  const ctx = await requirePermission("WRITE");
  try {
    if (!isPartnerModule(module)) return { error: "Módulo inválido." };
    const connection = await getActivePartnerConnection(ctx.workspaceId);
    if (!connection) return { error: "Nenhuma conexão ativa." };
    await prisma.$transaction(async (tx) => {
      await tx.partnerSharingPolicy.update({
        where: { connectionId_ownerWorkspaceId_module: { connectionId: connection.id, ownerWorkspaceId: ctx.workspaceId, module } },
        data: { enabled },
      });
      await log(tx, ctx, "partner.policy_updated", connection.id, { module, enabled });
    });
    invalidate();
    return { success: "Preferência de compartilhamento atualizada." };
  } catch (error) {
    return failure(error);
  }
}
