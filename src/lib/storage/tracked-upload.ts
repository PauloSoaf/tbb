import { storage } from "@/lib/storage";
import type { UploadOptions } from "@/lib/storage/storage-provider";
import { storageUsageService, type StorageLimitCheck } from "@/services/storageUsage.service";
import { auditLogService } from "@/services/audit-log.service";

export class StorageQuotaExceededError extends Error {
  check: StorageLimitCheck;

  constructor(check: StorageLimitCheck) {
    const mb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);
    const message =
      check.blockedReason === "SINGLE_FILE_LIMIT"
        ? `Este arquivo (${mb(check.incomingBytes)} MB) excede o limite por upload do seu plano (${mb(check.limitBytes ?? 0)} MB).`
        : check.blockedReason === "PURPOSE_QUOTA"
          ? `Limite de armazenamento para "${check.purpose}" do seu plano (${mb(check.limitBytes ?? 0)} MB) foi atingido.`
          : `Limite de armazenamento do seu plano (${mb(check.limitBytes ?? 0)} MB) foi atingido. Restam ${mb(check.remainingBytes ?? 0)} MB.`;
    super(message);
    this.name = "StorageQuotaExceededError";
    this.check = check;
  }
}

interface TrackedUploadOptions extends UploadOptions {
  purpose: string;
  resourceId?: string;
  uploadedByUserId?: string;
}

/**
 * Uploads a file through the shared storage provider AND records it in the
 * per-tenant storage ledger, enforcing the plan's `storage.maxMb` /
 * `storage.singleUpload.maxMb` limits first (tenant overrides included via
 * `getTenantSubscriptionContext`). This is the only upload path that should
 * be used for tenant-owned files — it's what makes "GB used per tenant/user"
 * and the admin storage overview possible without scanning every table that
 * can hold a file. If the ledger write fails after a successful upload, the
 * file is rolled back (deleted from the provider) so it can't silently count
 * against nothing.
 */
export async function uploadTrackedFile(
  tenantId: string,
  buffer: Buffer,
  options: TrackedUploadOptions
): Promise<string> {
  const check = await storageUsageService.checkStorageLimit(tenantId, buffer.byteLength, options.purpose);
  if (!check.allowed) {
    if (options.uploadedByUserId) {
      await auditLogService.record({
        tenantId,
        actor: { userId: options.uploadedByUserId, name: "Usuário", role: "NUTRITIONIST" },
        action: "storage.upload.blocked",
        resource: "storageFile",
        resourceId: options.resourceId ?? "unknown",
        result: "DENIED",
        reason: `Upload de ${options.purpose} bloqueado por quota: ${check.blockedReason}`,
        metadata: {
          purpose: options.purpose,
          incomingBytes: check.incomingBytes,
          usedBytes: check.usedBytes,
          limitBytes: check.limitBytes,
          planCode: check.planCode,
        },
      });
    }
    throw new StorageQuotaExceededError(check);
  }

  const url = await storage.uploadFile(buffer, options);

  try {
    await storageUsageService.recordUpload(tenantId, {
      url,
      sizeBytes: buffer.byteLength,
      purpose: options.purpose,
      resourceId: options.resourceId,
      uploadedByUserId: options.uploadedByUserId,
    });
  } catch (ledgerError) {
    console.error("[STORAGE_LEDGER] Failed to record upload, rolling back file:", ledgerError);
    await storage.deleteFile(url).catch((rollbackError) => {
      console.error("[STORAGE_LEDGER] Rollback delete also failed — orphaned file:", url, rollbackError);
    });
    throw ledgerError;
  }

  return url;
}

export async function deleteTrackedFile(tenantId: string, url: string): Promise<void> {
  await storage.deleteFile(url);
  await storageUsageService.recordDeletion(tenantId, url);
}
