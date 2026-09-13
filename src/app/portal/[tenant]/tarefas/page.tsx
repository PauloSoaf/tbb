import type { Metadata } from "next";
import { getPatientSessionFromCookies } from "@/lib/auth/patient-cookies";
import { redirect } from "next/navigation";
import { getPortalPatientAction } from "@/actions/patient-portal.action";
import { getPatientTasksForPortal } from "@/services/patient-portal.service";
import { TarefasClient } from "./TarefasClient";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";

interface Props {
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations();
  return { title: t("patient_portal.tasks.title", { defaultValue: "Minhas Tarefas" }) };
}

export default async function TarefasPage({ params }: Props) {
  const { tenant } = await params;
  const session = await getPatientSessionFromCookies();
  if (!session || session.nutritionistSlug !== tenant) {
    redirect(`/portal/${tenant}/login`);
  }

  const { patient } = await getPortalPatientAction(tenant);
  if (!patient) redirect(`/portal/${tenant}/login`);

  const tasks = await getPatientTasksForPortal(patient.id);
  const { t } = await getServerTranslations();

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">{t("patient_portal.tasks.title", { defaultValue: "Minhas Tarefas" })}</h1>
        <p className="text-text-secondary text-sm mt-1">
          {t("patient_portal.tasks.subtitle", { defaultValue: "Tarefas atribuídas pelo seu nutricionista. Marque como concluída ao completar." })}
        </p>
      </div>
      <TarefasClient tenantSlug={tenant} initialTasks={tasks} />
    </div>
  );
}
