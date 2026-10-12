"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { dayKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";
import { parsePersonalAsset } from "./personal-assets";

const text = (fd: FormData, key: string) => String(fd.get(key) || "").trim();
function version(fd: FormData) {
  const value = Number(text(fd, "version"));
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("Atualize a página antes de alterar este bem.");
  return value;
}
function failure(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return { error: "Não foi possível salvar. Atualize a página e tente novamente." };
  return { error: error instanceof Error ? error.message : "Não foi possível salvar o bem." };
}
function invalidate() {
  revalidatePath("/finance", "layout");
  revalidatePath("/today");
  revalidatePath("/insights");
}

export async function savePersonalAsset(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const id = text(fd, "id");
    const data = parsePersonalAsset(fd, dayKey(new Date(), ctx.workspace.timezone));
    const expectedVersion = id ? version(fd) : null;
    await prisma.$transaction(async tx => {
      if (data.debtId && !await tx.debt.findFirst({ where: { id: data.debtId, workspaceId: ctx.workspaceId }, select: { id: true } })) {
        throw new Error("Selecione uma dívida deste espaço.");
      }
      let entityId = id;
      if (id) {
        const result = await tx.personalAsset.updateMany({ where: { id, workspaceId: ctx.workspaceId, archivedAt: null, version: expectedVersion! }, data: { ...data, version: { increment: 1 } } });
        if (!result.count) throw new Error("O bem foi alterado, arquivado ou não está neste espaço. Atualize a página.");
      } else {
        const item = await tx.personalAsset.create({ data: { workspaceId: ctx.workspaceId, ...data } });
        entityId = item.id;
      }
      await tx.activityEvent.create({ data: { workspaceId: ctx.workspaceId, actorUserId: ctx.userId, type: id ? "asset.updated" : "asset.created", entityType: "PersonalAsset", entityId } });
    });
    invalidate();
    return { success: "Bem salvo no patrimônio." };
  } catch (error) { return failure(error); }
}

export async function setPersonalAssetArchived(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  try {
    const id = text(fd, "id"), operation = text(fd, "operation");
    if (!id || !["ARCHIVE", "RESTORE"].includes(operation)) throw new Error("Ação inválida.");
    const expectedVersion = version(fd), archive = operation === "ARCHIVE";
    await prisma.$transaction(async tx => {
      const result = await tx.personalAsset.updateMany({
        where: { id, workspaceId: ctx.workspaceId, version: expectedVersion, archivedAt: archive ? null : { not: null } },
        data: { archivedAt: archive ? new Date() : null, version: { increment: 1 } },
      });
      if (!result.count) throw new Error("O bem foi alterado ou não está neste espaço. Atualize a página.");
      await tx.activityEvent.create({ data: { workspaceId: ctx.workspaceId, actorUserId: ctx.userId, type: archive ? "asset.archived" : "asset.restored", entityType: "PersonalAsset", entityId: id } });
    });
    invalidate();
    return { success: archive ? "Bem arquivado e retirado do patrimônio." : "Bem restaurado no patrimônio." };
  } catch (error) { return failure(error); }
}
