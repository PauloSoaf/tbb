import type { Metadata } from "next";
import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { redirect } from "next/navigation";
import { getFoodDiaryAction } from "@/actions/patient-portal.action";
import { DiaryClient } from "./DiaryClient";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";

interface Props {
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations();
  return { title: t("patient_portal.diary.title", { defaultValue: "Diário Alimentar" }) };
}

export default async function DiarioPage({ params }: Props) {
  const { tenant } = await params;
  const session = await getPatientSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenant) redirect(`/portal/${tenant}/login`);

  const { entries = [] } = await getFoodDiaryAction(tenant);
  const { t } = await getServerTranslations();

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-4">
        {t("patient_portal.diary.title", { defaultValue: "Diário Alimentar" })}
      </h1>
      <DiaryClient tenantSlug={tenant} initialEntries={entries} />
    </div>
  );
}
