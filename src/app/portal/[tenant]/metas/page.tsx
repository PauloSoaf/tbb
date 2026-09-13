import type { Metadata } from "next";
import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { redirect } from "next/navigation";
import { getPatientGoals } from "@/services/goals.service";
import { getActiveRemindersForPatient } from "@/services/patient-portal.service";
import { getPortalPatientAction } from "@/actions/patient-portal.action";
import { MetasClient } from "./MetasClient";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";

interface Props {
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations();
  return { title: t("patient_portal.goals.page_title", { defaultValue: "Minhas Metas" }) };
}

export default async function PortalMetasPage({ params }: Props) {
  const { tenant } = await params;
  const session = await getPatientSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenant) {
    redirect(`/portal/${tenant}/login`);
  }

  const { patient } = await getPortalPatientAction(tenant);
  if (!patient) redirect(`/portal/${tenant}/login`);

  const [goals, reminders] = await Promise.all([
    getPatientGoals(patient.nutritionistId, patient.id),
    getActiveRemindersForPatient(patient.id),
  ]);

  const { t } = await getServerTranslations();

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          {t("patient_portal.goals.title", { defaultValue: "Metas e Lembretes" })}
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          {t("patient_portal.goals.subtitle", { defaultValue: "Acompanhe seus objetivos e os lembretes do seu nutricionista." })}
        </p>
      </div>

      <MetasClient tenantSlug={tenant} patientId={patient.id} initialGoals={goals} initialReminders={reminders} />
    </div>
  );
}
