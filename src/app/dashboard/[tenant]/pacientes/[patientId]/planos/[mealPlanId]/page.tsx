import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { Metadata } from "next";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { getMealPlanById } from "@/services/meal-plan.service";
import { MealPlanClientView } from "./MealPlanClientView";

export const metadata: Metadata = { title: "Editar Plano Alimentar" };

export default async function MealPlanDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; patientId: string; mealPlanId: string }>;
}) {
  const { tenant, patientId, mealPlanId } = await params;
  const { nutritionist } = await assertTenantAccess(tenant);

  const plan = await getMealPlanById(nutritionist.id, mealPlanId);
  if (!plan) return <div className="p-6">Plano alimentar não encontrado.</div>;

  return (
    <MealPlanClientView
      tenantSlug={tenant}
      patientId={patientId}
      plan={plan}
    />
  );
}
