"use server";

import { getSessionFromCookies } from "@/lib/auth/cookies";
import { usageLimitService } from "@/services/usageLimit.service";
import { storageUsageService, type StorageQuotaStatusResult } from "@/services/storageUsage.service";
import { storageAlertService } from "@/services/admin/storage-alert.service";

/**
 * Storage quota snapshot for the current tenant, used by `StorageQuotaBanner`
 * on the dashboard to warn before uploads get blocked. Opportunistically
 * checks/emits a threshold-crossing SecurityEvent for the Global Admin — this
 * is the only place a nutritionist's storage usage naturally gets read on
 * every dashboard visit, so it doubles as the trigger instead of a cron.
 */
export async function getMyStorageQuotaStatusAction(): Promise<StorageQuotaStatusResult | null> {
  const session = await getSessionFromCookies();
  if (!session) return null;

  const status = await storageUsageService.getStorageQuotaStatus(session.nutritionistId);
  storageAlertService.checkAndEmitThresholdEvent(session.nutritionistId).catch((err) => {
    console.error("[STORAGE_ALERT] Failed to check/emit threshold event:", err);
  });
  return status;
}

/**
 * Checks the tenant's monthly meal-plan-PDF quota and, if allowed, atomically
 * consumes one unit. Called right before the client generates the PDF
 * (jsPDF/html2canvas run entirely client-side, so this is the only
 * server-side interception point for this feature).
 */
export async function consumeMealPlanPdfQuotaAction(): Promise<
  { allowed: true } | { allowed: false; limit: number }
> {
  const session = await getSessionFromCookies();
  if (!session) return { allowed: false, limit: 0 };

  const check = await usageLimitService.checkUsageLimit(session.nutritionistId, "mealPlanPdf.monthly");
  if (!check.allowed) {
    return { allowed: false, limit: check.limit ?? 0 };
  }

  await usageLimitService.incrementUsage(session.nutritionistId, "mealPlanPdf.monthly");
  return { allowed: true };
}
