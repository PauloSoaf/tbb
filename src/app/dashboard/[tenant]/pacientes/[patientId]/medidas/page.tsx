import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Plus, Ruler } from "lucide-react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { getPatientMeasurementsByPatient } from "@/services/patient-measurement.service";
import { getPatientById } from "@/services/patient.service";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";
import { AnthropometryHistoryTable } from "@/components/anthropometry/AnthropometryHistoryTable";
import { AnthropometryMobileCard } from "@/components/anthropometry/AnthropometryMobileCard";
import { AnthropometryEvolutionChart } from "@/components/anthropometry/AnthropometryEvolutionChart";
import { AnthropometrySummaryCard } from "@/components/anthropometry/AnthropometrySummaryCard";
import { ManualWeightQuickForm } from "@/components/anthropometry/ManualWeightQuickForm";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";
import { createManualWeightAction } from "./actions";

export const metadata: Metadata = {
  title: "Antropometria | NutriOpus",
};

interface MeasurementsPageProps {
  params: Promise<{
    tenant: string;
    patientId: string;
  }>;
}

export default async function MeasurementsPage(props: MeasurementsPageProps) {
  const { tenant, patientId: patientRouteParam } = await props.params;

  const { nutritionist } = await assertTenantAccess(tenant);
  const patientId = await resolvePatientIdFromRouteParam(nutritionist.id, patientRouteParam);

  const [patient, measurements, { t }] = await Promise.all([
    getPatientById(nutritionist.id, patientId),
    getPatientMeasurementsByPatient(nutritionist.id, patientId),
    getServerTranslations(),
  ]);

  if (!patient) {
    notFound();
  }

  const manualWeightAction = createManualWeightAction.bind(null, tenant, patientId, patientRouteParam);
  const latestMeasurement = measurements[0] ?? null;

  const chartData = measurements
    .map((m) => ({
      measuredAt: m.measuredAt,
      weight: m.weight,
      bmi: m.bmi,
      bodyFatPercentage: m.bodyFatPercentage,
      leanMassKg: m.leanMassKg,
    }))
    .reverse();

  return (
    <div className="relative min-h-screen bg-surface-warm pb-20">
      <DashboardHeader
        title={t("anthropometry.evaluations_and_evolution")}
        subtitle={t("anthropometry.anthropometric_tracking", { name: patient.name })}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: `/dashboard/${tenant}` },
          { label: t("nav.patients"), href: `/dashboard/${tenant}/pacientes` },
          { label: patient.name, href: `/dashboard/${tenant}/pacientes/${patientRouteParam}` },
          { label: t("anthropometry_pages.evaluations"), current: true },
        ]}
        backButton={{ href: `/dashboard/${tenant}/pacientes/${patientRouteParam}`, label: t("navigation.back_to", { label: patient.name }) }}
      />

      <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      <ManualWeightQuickForm action={manualWeightAction} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {t("anthropometry.evaluations_and_evolution")}: {patient.name}
          </h1>
        </div>

        <div className="flex gap-2">
          <PendingButtonLink
            href={`/dashboard/${tenant}/pacientes/${patientRouteParam}/avaliacoes/adipometro`}
            pendingLabel="Abrindo..."
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-border-neutral text-text-secondary hover:bg-warm-surface text-sm font-medium rounded-lg transition-colors"
          >
            <Ruler className="w-4 h-4" />
            {t("anthropometry_pages.adipometer_title")}
          </PendingButtonLink>
          <PendingButtonLink
            href={`/dashboard/${tenant}/pacientes/${patientRouteParam}/avaliacoes/nova`}
            pendingLabel="Abrindo..."
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t("anthropometry.new_evaluation")}
          </PendingButtonLink>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AnthropometrySummaryCard
            tenantSlug={tenant}
            patientId={patientRouteParam}
            latestMeasurement={latestMeasurement}
          />
        </div>
        
        <div className="lg:col-span-2">
          <AnthropometryEvolutionChart data={chartData} />
        </div>
      </div>

      <div className="bg-card-bg rounded-xl border border-border-neutral overflow-hidden">
        <div className="p-5 border-b border-border-neutral">
          <h2 className="text-lg font-semibold text-text-primary">
            {t("anthropometry.evaluation_history")}
          </h2>
        </div>
        
        {measurements.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">
            {t("anthropometry.no_evaluation_yet")}
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block">
              <AnthropometryHistoryTable
                tenantSlug={tenant}
                patientId={patientRouteParam}
                measurements={measurements}
              />
            </div>
            
            {/* Mobile View */}
            <div className="md:hidden p-4 space-y-4 bg-warm-surface">
              {measurements.map((m) => (
                <AnthropometryMobileCard
                  key={m.id}
                  tenantSlug={tenant}
                  patientId={patientRouteParam}
                  measurement={m}
                />
              ))}
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
