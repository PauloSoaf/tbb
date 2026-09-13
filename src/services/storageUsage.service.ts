import { prisma } from "@/lib/prisma";
export function operationalStorageLimits() {
  const read = (key: string, fallback: number) => {
    const value = Number(process.env[key] ?? fallback);
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${key} inválido.`);
    return value;
  };
  return { total: read("TBB_STORAGE_MAX_BYTES", 100 * 1024 * 1024), single: read("TBB_UPLOAD_MAX_BYTES", 10 * 1024 * 1024) };
}
export const storageUsageService = {
  async getUsage(workspaceId: string) {
    const aggregate = await prisma.storageFile.aggregate({ where: { workspaceId }, _sum: { sizeBytes: true }, _count: true });
    return { usedBytes: aggregate._sum.sizeBytes ?? 0, fileCount: aggregate._count, operationalLimits: operationalStorageLimits() };
  },
};
