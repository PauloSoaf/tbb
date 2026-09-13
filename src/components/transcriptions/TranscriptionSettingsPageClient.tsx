"use client";

import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useI18n } from "@/lib/i18n/I18nContext";
import { TranscriptionSettingsForm } from "./TranscriptionSettingsForm";

type Props = React.ComponentProps<typeof TranscriptionSettingsForm>;

export function TranscriptionSettingsPageClient(props: Props) {
  const { t } = useI18n();
  return (
    <>
      <DashboardHeader
        title={t("transcription.settings.title")}
        subtitle={t("transcription.automaticDescription")}
      />
      <main className="p-4 lg:p-8">
        <TranscriptionSettingsForm {...props} />
      </main>
    </>
  );
}
