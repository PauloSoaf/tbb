import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { getPatientById } from "@/services/patient.service";
import { getShoppingListsByPatient } from "@/services/shopping-list.service";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { NutritionistShoppingListView } from "@/components/patients/shopping-list/NutritionistShoppingListView";

export const metadata: Metadata = { title: "Lista de compras" };

export default async function PatientShoppingListDashboardPage({
  params,
}: {
  params: Promise<{ tenant: string; patientId: string }>;
}) {
  const { tenant, patientId: patientSlug } = await params;
  const { session } = await assertTenantAccess(tenant);
  const patientId = await resolvePatientIdFromRouteParam(session.nutritionistId, patientSlug);

  const [patient, lists] = await Promise.all([
    getPatientById(session.nutritionistId, patientId),
    getShoppingListsByPatient({
      nutritionistId: session.nutritionistId,
      patientId,
      take: 8,
    }),
  ]);

  if (!patient) notFound();

  return (
    <div className="min-h-screen bg-surface-warm pb-16">
      <DashboardHeader title="Lista de compras" subtitle={patient.name} />
      <NutritionistShoppingListView
        tenantSlug={tenant}
        patientId={patientId}
        patientName={patient.name}
        lists={lists}
      />
    </div>
  );
}
