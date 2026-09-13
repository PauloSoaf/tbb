import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { NewMealPlanClient } from "./NewMealPlanClient";

interface Props {
  params: Promise<{ tenant: string; patientId: string }>;
}

export default async function NewMealPlanPage({ params }: Props) {
  const { tenant, patientId: patientSlug } = await params;
  const { session } = await assertTenantAccess(tenant);
  // Resolve slug → UUID before passing to client component
  const patientId = await resolvePatientIdFromRouteParam(session.nutritionistId, patientSlug);

  return <NewMealPlanClient tenant={tenant} patientSlug={patientSlug} patientId={patientId} />;
}
