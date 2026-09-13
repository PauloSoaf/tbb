"use client";

import { useParams } from "next/navigation";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { useI18n } from "@/lib/i18n/I18nContext";

export default function Loading() {
  const { t } = useI18n();
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant ?? "";

  return (
    <>
      <DashboardHeader
        title={t("nav.dashboard")}
      />
      <DashboardSkeleton />
    </>
  );
}
