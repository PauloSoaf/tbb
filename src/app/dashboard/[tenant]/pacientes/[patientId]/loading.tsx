"use client";

import { useParams } from "next/navigation";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PatientRecordSkeleton } from "@/components/skeletons/PatientRecordSkeleton";
import { useI18n } from "@/lib/i18n/I18nContext";
import { routes } from "@/lib/navigation/routes";

export default function Loading() {
  const { t } = useI18n();
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant ?? "";

  return (
    <>
      <DashboardHeader
        title={t("nav.patients")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: routes.dashboard(tenant) },
          { label: t("nav.patients"), href: routes.patients(tenant) },
          { label: "...", current: true },
        ]}
        backButton={{ href: routes.patients(tenant), label: t("navigation.back_to_patients") }}
      />
      <PatientRecordSkeleton />
    </>
  );
}
