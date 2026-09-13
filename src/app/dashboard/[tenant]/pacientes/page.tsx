import { listPatients, listDistinctPatientTags } from "@/services/patient.service";
import { getPatientsStats } from "@/services/patient-list.service";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { PacientesPageClient } from "@/components/patients/PacientesPageClient";

interface PacientesPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ q?: string; status?: string; engagement?: string; sort?: string; tag?: string; created?: string }>;
}

export default async function PacientesPage({ params, searchParams }: PacientesPageProps) {
  const { tenant } = await params;
  const { q, status, engagement, sort, tag, created } = await searchParams;
  const { session } = await assertTenantAccess(tenant);

  const [patients, availableTags, stats] = await Promise.all([
    listPatients(session.nutritionistId, q, status, engagement, sort, tag),
    listDistinctPatientTags(session.nutritionistId),
    getPatientsStats(session.nutritionistId),
  ]);

  return (
    <PacientesPageClient
      tenant={tenant}
      patients={patients}
      availableTags={availableTags}
      stats={stats}
      filters={{ q, status, engagement, sort, tag }}
      showCreatedSuccess={created === "1"}
    />
  );
}
