"use client";

import { useParams } from "next/navigation";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { SkeletonBase } from "@/components/skeletons/SkeletonBase";
import { useI18n } from "@/lib/i18n/I18nContext";
import { routes } from "@/lib/navigation/routes";

export default function Loading() {
  const { t } = useI18n();
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant ?? "";

  return (
    <>
      <DashboardHeader
        title={t("nav.team")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: routes.dashboard(tenant) },
          { label: t("nav.team"), current: true },
        ]}
      />
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6" aria-hidden="true">
        <div className="flex items-center justify-between">
          <SkeletonBase className="h-5 w-32" />
          <SkeletonBase className="h-9 w-36" />
        </div>
        <TableSkeleton rows={4} cols={4} />
      </div>
    </>
  );
}
