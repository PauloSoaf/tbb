"use client";

import type { ComponentProps } from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { CareSessionRoom, CareSessionData } from "@/components/care-session/CareSessionRoom";

interface Props {
  tenant: string;
  careSession: CareSessionData;
  customTitle?: string | null;
  initialTranscriptions?: unknown[];
  latestAnamnese?: ComponentProps<typeof CareSessionRoom>["latestAnamnese"];
  latestMeasurement?: ComponentProps<typeof CareSessionRoom>["latestMeasurement"];
  transcriptionSettings?: ComponentProps<typeof CareSessionRoom>["transcriptionSettings"];
  initialRealtimeTranscript?: ComponentProps<typeof CareSessionRoom>["initialRealtimeTranscript"];
}

export function CareSessionPageClient({
  tenant,
  careSession,
  customTitle,
  initialTranscriptions,
  latestAnamnese,
  latestMeasurement,
  transcriptionSettings,
  initialRealtimeTranscript,
}: Props) {
  const { t } = useI18n();
  const title = customTitle ?? t("care_session.with_patient", { name: careSession.patient.name });
  const subtitle = t("care_session.patient_label", { name: careSession.patient.name });

  return (
    <>
      <DashboardHeader title={title} subtitle={subtitle} />
      <CareSessionRoom
        tenantSlug={tenant}
        careSession={careSession}
        role="NUTRITIONIST"
        initialTranscriptions={initialTranscriptions}
        latestAnamnese={latestAnamnese}
        latestMeasurement={latestMeasurement}
        transcriptionSettings={transcriptionSettings}
        initialRealtimeTranscript={initialRealtimeTranscript}
      />
    </>
  );
}
