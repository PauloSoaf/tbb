import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/tenancy/requirePermission";
import { getPatientById } from "@/services/patient.service";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { AppBackButton } from "@/components/navigation/AppBackButton";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";
import { AnthropometryForm } from "@/components/anthropometry/AnthropometryForm";
import { createMeasurementAction } from "../actions";
import { calculateAge } from "@/lib/utils/calculateAge";
import { suggestAssessmentProfile } from "@/lib/anthropometry";

export const metadata: Metadata = {
  title: "Nova Avaliação Antropométrica | NutriOpus",
};

interface NewMeasurementPageProps {
  params: Promise<{
    tenant: string;
    patientId: string;
  }>;
}

export default async function NewMeasurementPage(props: NewMeasurementPageProps) {
  const { tenant, patientId: patientRouteParam } = await props.params;

  const { nutritionist } = await requirePermission("patients", "edit", tenant);
  const patientId = await resolvePatientIdFromRouteParam(nutritionist.id, patientRouteParam);

  const [patient, { t }] = await Promise.all([
    getPatientById(nutritionist.id, patientId),
    getServerTranslations(),
  ]);

  if (!patient) {
    notFound();
  }

  // Bind parameters to the server action
  const boundAction = createMeasurementAction.bind(null, tenant, patientId, patientRouteParam);
  const rawAssessmentAge = patient.birthDate ? calculateAge(patient.birthDate) : null;
  const assessmentAge = rawAssessmentAge !== null && rawAssessmentAge >= 0 ? rawAssessmentAge : null;
  const biologicalSex = patient.gender === "M" || patient.gender === "F" ? patient.gender : "UNSPECIFIED";

  return (
    <div className="relative min-h-screen pb-20">
      <DashboardHeader
        title={t("anthropometry_pages.new_evaluation_title")}
        subtitle={t("anthropometry_pages.new_evaluation_subtitle", { name: patient.name })}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: `/dashboard/${tenant}` },
          { label: t("nav.patients"), href: `/dashboard/${tenant}/pacientes` },
          { label: patient.name, href: `/dashboard/${tenant}/pacientes/${patientRouteParam}` },
          { label: t("anthropometry_pages.evaluations"), href: `/dashboard/${tenant}/pacientes/${patientRouteParam}/avaliacoes` },
          { label: t("anthropometry_pages.new_evaluation_title"), current: true },
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div>
          <AppBackButton
            href={`/dashboard/${tenant}/pacientes/${patientRouteParam}/avaliacoes`}
            label={t("anthropometry_pages.back_to_history")}
            className="mb-2"
          />
          <h1 className="text-2xl font-bold text-text-primary">
            {t("anthropometry_pages.new_evaluation_heading", { name: patient.name })}
          </h1>
          <p className="text-text-secondary mt-1">
            {t("anthropometry_pages.new_evaluation_desc")}
          </p>
        </div>

        <AnthropometryForm
          action={boundAction}
          defaultValues={{
            assessmentAge,
            assessmentProfile: suggestAssessmentProfile(assessmentAge),
            biologicalSex,
          }}
        />
      </div>
    </div>
  );
}
