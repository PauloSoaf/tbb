import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { getPatientById } from "@/services/patient.service";
import { getServerTranslations } from "@/lib/i18n/getServerTranslations";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { InternalAnamneseForm } from "@/components/forms/InternalAnamneseForm";

export const metadata: Metadata = {
  title: "Nova Anamnese | NutriOpus",
};

interface NovaAnamnesePageProps {
  params: Promise<{
    tenant: string;
    patientId: string;
  }>;
}

export default async function NovaAnamnesePage({ params }: NovaAnamnesePageProps) {
  const { tenant, patientId: patientSlug } = await params;
  const { nutritionist } = await assertTenantAccess(tenant);
  const patientId = await resolvePatientIdFromRouteParam(nutritionist.id, patientSlug);

  const [patient, { t }] = await Promise.all([
    getPatientById(nutritionist.id, patientId),
    getServerTranslations(),
  ]);

  if (!patient) {
    notFound();
  }

  const defaultValues = {
    name: patient.name,
    phone: patient.phone,
    email: patient.email || "",
    birthDate: patient.birthDate ? new Date(patient.birthDate).toISOString().split("T")[0] : "",
    weight: patient.weight ? String(patient.weight) : "",
    height: patient.height ? String(patient.height) : "",
    goal: patient.goal || "",
  };

  return (
    <div className="relative min-h-screen bg-surface-warm pb-20">
      <DashboardHeader
        title={t("anamnese_page.new_title")}
        subtitle={t("anamnese_page.new_subtitle", { name: patient.name })}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: `/dashboard/${tenant}` },
          { label: t("nav.patients"), href: `/dashboard/${tenant}/pacientes` },
          { label: patient.name, href: `/dashboard/${tenant}/pacientes/${patientSlug}` },
          { label: t("anamnese_page.title"), href: `/dashboard/${tenant}/pacientes/${patientSlug}/anamnese` },
          { label: t("anamnese_page.new_title"), current: true },
        ]}
        backButton={{
          href: `/dashboard/${tenant}/pacientes/${patientSlug}/anamnese`,
          label: t("navigation.back_to", { label: t("anamnese_page.title") }),
        }}
      />

      <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {t("anamnese_page.new_title")}
          </h1>
          <p className="text-text-secondary mt-1">
            {t("anamnese_page.new_subtitle", { name: patient.name })}
          </p>
        </div>

        <InternalAnamneseForm 
          tenantSlug={tenant} 
          patientId={patientId}
          patientRouteParam={patientSlug}
          defaultValues={defaultValues} 
        />
      </div>
    </div>
  );
}
