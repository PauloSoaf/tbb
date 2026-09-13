import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { getSkinfoldAssessments } from "@/services/skinfold.service";
import { getPatientById } from "@/services/patient.service";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { AppBackButton } from "@/components/navigation/AppBackButton";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";
import { SkinfoldForm } from "@/components/skinfold/SkinfoldForm";
import { SkinfoldHistory } from "@/components/skinfold/SkinfoldHistory";
import { SkinfoldEvolutionChart } from "@/components/skinfold/SkinfoldEvolutionChart";

interface AdipometerPageProps {
  params: Promise<{
    tenant: string;
    patientId: string;
  }>;
}

export default async function AdipometerPage(props: AdipometerPageProps) {
  const { tenant, patientId: patientRouteParam } = await props.params;

  const { session } = await assertTenantAccess(tenant);
  const patientId = await resolvePatientIdFromRouteParam(session.nutritionistId, patientRouteParam);
  const patientSlug = patientRouteParam;

  const [patient, assessments, { t }] = await Promise.all([
    getPatientById(session.nutritionistId, patientId),
    getSkinfoldAssessments(session.nutritionistId, patientId),
    getServerTranslations(),
  ]);

  if (!patient) notFound();

  const patientAge = patient.birthDate
    ? Math.floor((new Date().getTime() - new Date(patient.birthDate).getTime()) / 3.15576e10)
    : undefined;

  return (
    <div className="relative min-h-screen pb-20">
      <DashboardHeader
        title={t("anthropometry_pages.adipometer_title")}
        subtitle={t("anthropometry_pages.adipometer_subtitle", { name: patient.name })}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: `/dashboard/${tenant}` },
          { label: t("nav.patients"), href: `/dashboard/${tenant}/pacientes` },
          { label: patient.name, href: `/dashboard/${tenant}/pacientes/${patientSlug}` },
          { label: t("anthropometry_pages.evaluations"), href: `/dashboard/${tenant}/pacientes/${patientSlug}/avaliacoes` },
          { label: t("anthropometry_pages.adipometer_title"), current: true },
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div>
          <AppBackButton
            href={`/dashboard/${tenant}/pacientes/${patientSlug}/avaliacoes`}
            label={t("anthropometry_pages.back_to_measurements")}
            className="mb-2"
          />
          <h1 className="text-2xl font-bold text-text-primary">
            {t("anthropometry_pages.adipometer_title")}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {t("anthropometry_pages.adipometer_subtitle", { name: patient.name })}
          </p>
        </div>

        <SkinfoldForm
          tenantSlug={tenant}
          patientId={patientId}
          patientSex={(patient as { sex?: string }).sex as "M" | "F" | undefined}
          patientAge={patientAge}
        />

        <SkinfoldEvolutionChart assessments={assessments} />

        <SkinfoldHistory
          tenantSlug={tenant}
          patientId={patientId}
          initialAssessments={assessments}
        />
      </div>
    </div>
  );
}
