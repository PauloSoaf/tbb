import { prisma } from "@/lib/prisma";

export interface StorageReconciliationReport {
  totalLedgerFiles: number;
  missingSizeCount: number;
  duplicateUrlCount: number;
  providerCheckApplicable: boolean;
  providerSampledCount: number;
  providerMissingCount: number;
  providerMissingUrls: string[];
  ranAt: string;
}

const PROVIDER_SAMPLE_SIZE = 50;

/**
 * Read-only drift report between the `StorageFile` ledger and reality.
 * Never deletes or mutates anything — per spec, this sprint only reports,
 * a future sprint decides what to do about the drift found here.
 */
export const storageReconciliationService = {
  async reconcile(): Promise<StorageReconciliationReport> {
    const [totalLedgerFiles, missingSizeCount, urlGroups] = await Promise.all([
      prisma.storageFile.count(),
      prisma.storageFile.count({ where: { sizeBytes: 0 } }),
      prisma.storageFile.groupBy({ by: ["url"], _count: { _all: true } }),
    ]);
    const duplicateGroups = urlGroups.filter((g) => g._count._all > 1);

    const providerCheckApplicable =
      process.env.STORAGE_PROVIDER === "vercel-blob" || !!process.env.BLOB_READ_WRITE_TOKEN;

    let providerSampledCount = 0;
    const providerMissingUrls: string[] = [];

    if (providerCheckApplicable) {
      const { head } = await import("@vercel/blob");
      const sample = await prisma.storageFile.findMany({
        orderBy: { createdAt: "desc" },
        take: PROVIDER_SAMPLE_SIZE,
        select: { url: true },
      });

      for (const { url } of sample) {
        providerSampledCount += 1;
        try {
          await head(url);
        } catch {
          providerMissingUrls.push(url);
        }
      }
    }

    return {
      totalLedgerFiles,
      missingSizeCount,
      duplicateUrlCount: duplicateGroups.length,
      providerCheckApplicable,
      providerSampledCount,
      providerMissingCount: providerMissingUrls.length,
      providerMissingUrls: providerMissingUrls.slice(0, 20), // cap payload size
      ranAt: new Date().toISOString(),
    };
  },
};
