"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { getMyStorageQuotaStatusAction } from "@/actions/billing.action";
import { useI18n } from "@/lib/i18n/I18nContext";

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

const TONE_STYLES = {
  attention: "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300",
  near_limit: "border-orange-300 bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/10 text-orange-800 dark:text-orange-300",
  blocked: "border-red-300 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 text-red-800 dark:text-red-300",
} as const;

export function StorageQuotaBanner({ tenant }: { tenant: string }) {
  const { t } = useI18n();
  const [quota, setQuota] = useState<Awaited<ReturnType<typeof getMyStorageQuotaStatusAction>>>(null);

  useEffect(() => {
    getMyStorageQuotaStatusAction().then(setQuota);
  }, []);

  if (!quota || quota.percentUsed === null || quota.percentUsed < 70) return null;

  const tone = quota.status === "blocked" ? "blocked" : quota.status === "near_limit" ? "near_limit" : "attention";
  const Icon = tone === "blocked" ? AlertCircle : AlertTriangle;

  return (
    <div className={`rounded-2xl border p-4 flex items-start gap-3 ${TONE_STYLES[tone]}`}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">
          {tone === "blocked"
            ? t("storage.quota.exceeded")
            : t("storage.quota.warningTitle", { percent: quota.percentUsed })}
        </p>
        <p className="text-xs mt-0.5 opacity-90">
          {t("storage.quota.usageDetail", {
            used: formatMb(quota.usedBytes),
            limit: formatMb(quota.limitBytes ?? 0),
          })}
        </p>
      </div>
      <Link
        href={`/dashboard/${tenant}/config`}
        className="text-xs font-semibold underline shrink-0 hover:opacity-80"
      >
        {t("storage.quota.viewDetails")}
      </Link>
    </div>
  );
}
