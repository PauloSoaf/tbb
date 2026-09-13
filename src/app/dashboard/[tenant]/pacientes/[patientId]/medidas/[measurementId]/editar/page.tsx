import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/tenancy/requirePermission";
import { getPatientById } from "@/services/patient.service";
import { getPatientMeasurementById } from "@/services/patient-measurement.service";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { AppBackButton } from "@/components/navigation/AppBackButton";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";
import { AnthropometryForm } from "@/components/anthropometry/AnthropometryForm";
import { updateMeasurementAction } from "../../actions";

export const metadata: Metadata = {
  title: "Editar Avaliação Antropométrica | NutriOpus",
};

interface EditMeasurementPageProps {
  params: Promise<{
    tenant: string;
    patientId: string;
    measurementId: string;
  }>;
}

export default async function EditMeasurementPage(props: EditMeasurementPageProps) {
  const { tenant, patientId: patientRouteParam, measurementId } = await props.params;

  const { nutritionist } = await requirePermission("patients", "edit", tenant);
  const patientId = await resolvePatientIdFromRouteParam(nutritionist.id, patientRouteParam);

  const [patient, measurement, { t }] = await Promise.all([
    getPatientById(nutritionist.id, patientId),
    getPatientMeasurementById(nutritionist.id, measurementId),
    getServerTranslations(),
  ]);

  if (!patient || !measurement || measurement.patientId !== patientId) {
    notFound();
  }

  // Bind parameters to the server action
  const boundAction = updateMeasurementAction.bind(null, tenant, patientId, patientRouteParam, measurementId);

  // Prepare default values
  const defaultValues = {
    ...measurement,
    measuredAt: new Date(measurement.measuredAt).toISOString().split("T")[0],
  };

  return (
    <div className="relative min-h-screen pb-20">
      <DashboardHeader
        title={t("anthropometry_pages.edit_evaluation_title")}
        subtitle={t("anthropometry_pages.edit_evaluation_subtitle", { name: patient.name })}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: `/dashboard/${tenant}` },
          { label: t("nav.patients"), href: `/dashboard/${tenant}/pacientes` },
          { label: patient.name, href: `/dashboard/${tenant}/pacientes/${patientRouteParam}` },
          { label: t("anthropometry_pages.evaluations"), href: `/dashboard/${tenant}/pacientes/${patientRouteParam}/avaliacoes` },
          { label: t("anthropometry_pages.edit_evaluation_title"), current: true },
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div>
          <AppBackButton
            href={`/dashboard/${tenant}/pacientes/${patientRouteParam}/avaliacoes/${measurementId}`}
            label={t("anthropometry_pages.back_to_evaluation")}
            className="mb-2"
          />
          <h1 className="text-2xl font-bold text-text-primary">
            {t("anthropometry_pages.edit_evaluation_heading", { name: patient.name })}
          </h1>
          <p className="text-text-secondary mt-1">
            {t("anthropometry_pages.edit_evaluation_desc")}
          </p>
        </div>

        <AnthropometryForm
          action={boundAction}
          defaultValues={defaultValues}
          submitLabel="Salvar alterações"
        />
      </div>
    </div>
  );
}
