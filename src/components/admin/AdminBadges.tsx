"use client";

import { Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

export function GlobalAdminBadge() {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30">
      <Shield className="w-3 h-3" />
      {t("admin.global.badge")}
    </span>
  );
}

export type SystemStatus = "operational" | "partial" | "offline";

const statusStyles: Record<SystemStatus, string> = {
  operational:
    "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border-emerald-200 dark:border-emerald-500/30",
  partial:
    "bg-amber-50 dark:bg-amber-950/30 text-amber-600 border-amber-200 dark:border-amber-500/30",
  offline:
    "bg-red-50 dark:bg-red-950/30 text-red-600 border-red-200 dark:border-red-500/30",
};

export function SystemStatusBadge({ status = "operational" }: { status?: SystemStatus }) {
  const { t } = useI18n();
  return (
    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusStyles[status]}`}>
      ● {t(`admin.system.${status}`)}
    </span>
  );
}

export function AdminHeaderBadges({ status = "operational" }: { status?: SystemStatus }) {
  return (
    <span className="flex items-center gap-2">
      <GlobalAdminBadge />
      <SystemStatusBadge status={status} />
    </span>
  );
}
