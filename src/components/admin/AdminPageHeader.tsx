"use client";

import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { AdminHeaderBadges } from "@/components/admin/AdminBadges";
import { useI18n } from "@/lib/i18n/I18nContext";

interface AdminPageHeaderProps {
  titleKey: string;
  subtitleKey?: string;
}

export function AdminPageHeader({ titleKey, subtitleKey }: AdminPageHeaderProps) {
  const { t } = useI18n();

  return (
    <DashboardHeader
      title={t(titleKey)}
      subtitle={subtitleKey ? t(subtitleKey) : undefined}
      badge={<AdminHeaderBadges />}
      showNotifications={false}
    />
  );
}
