import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { requirePermission, AuthorizationError } from "@/lib/workspace";
import { operationalStorageLimits } from "@/services/storageUsage.service";
import { getWorkspaceSubscriptionContext } from "@/lib/billing/subscription-context";

export async function uploadTrackedFile(buffer: Buffer, options: { fileName: string; mimeType: string; purpose: string }) {
  const ctx = await requirePermission("WRITE");
  const operational = operationalStorageLimits();
  const subscription = await getWorkspaceSubscriptionContext(ctx.workspaceId);
  if (subscription.planCode && !subscription.active) throw new Error("Assinatura inativa para novos uploads.");
  const feature = subscription.featureLimits["storage.bytes"];
  if (feature && !feature.enabled) throw new Error("Armazenamento desabilitado na assinatura.");
  const maximum = feature?.limit === null ? operational.total : Math.min(operational.total, feature?.limit ?? operational.total);
  if (!buffer.byteLength || buffer.byteLength > operational.single) throw new Error("Arquivo vazio ou acima do limite por upload.");
  let storageKey: string | undefined;
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${ctx.workspaceId} FOR UPDATE`;
      const usage = await tx.storageFile.aggregate({ where: { workspaceId: ctx.workspaceId }, _sum: { sizeBytes: true } });
      if ((usage._sum.sizeBytes ?? 0) + buffer.byteLength > maximum) throw new Error("Limite de armazenamento atingido.");
      storageKey = await storage.uploadFile(buffer, { fileName: options.fileName, folder: ctx.workspaceId, contentType: options.mimeType });
      return await tx.storageFile.create({ data: { workspaceId: ctx.workspaceId, storageKey,
        originalName: options.fileName.slice(0, 240), mimeType: options.mimeType,
        purpose: options.purpose, sizeBytes: buffer.byteLength, uploadedByUserId: ctx.userId } });
    }, { timeout: 30000 });
  } catch (error) {
    if (storageKey) await storage.deleteFile(storageKey).catch(() => undefined);
    throw error;
  }
}
export async function readTrackedFile(id: string) {
  const ctx = await requirePermission("READ");
  const file = await prisma.storageFile.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
  if (!file) throw new AuthorizationError("Arquivo não encontrado.");
  return { file, bytes: await storage.readFile(file.storageKey) };
}
export async function deleteTrackedFile(id: string) {
  const ctx = await requirePermission("WRITE");
  const file = await prisma.storageFile.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
  if (!file) throw new AuthorizationError("Arquivo não encontrado.");
  await storage.deleteFile(file.storageKey);
  await prisma.storageFile.deleteMany({ where: { id, workspaceId: ctx.workspaceId } });
}
