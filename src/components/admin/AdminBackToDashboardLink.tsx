"use client";

import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";

export function AdminBackToDashboardLink({ href, userEmail }: { href: string; userEmail: string }) {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <div className="px-1 text-[11px] text-text-secondary">
        <span className="block font-bold text-text-primary truncate">{userEmail}</span>
      </div>
      <PendingButtonLink
        href={href}
        pendingLabel={t("common.loading", { defaultValue: "Abrindo dashboard..." })}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-background)] hover:bg-[var(--sidebar-hover)] text-xs font-semibold text-text-primary transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{t("admin.nav.backToDashboard")}</span>
      </PendingButtonLink>
    </div>
  );
}
