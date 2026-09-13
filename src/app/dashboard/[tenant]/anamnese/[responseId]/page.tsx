import { notFound } from "next/navigation";
import { getAnamneseById } from "@/services/anamnese.service";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { AnamneseDetailPageClient } from "@/components/anamnese/AnamneseDetailPageClient";

interface AnamneseDetailPageProps {
  params: Promise<{ tenant: string; responseId: string }>;
}

export default async function AnamneseDetailPage({ params }: AnamneseDetailPageProps) {
  const { tenant, responseId } = await params;
  const { session } = await assertTenantAccess(tenant);

  const anamnese = await getAnamneseById(session.nutritionistId, responseId);

  if (!anamnese) {
    notFound();
  }

  return (
    <AnamneseDetailPageClient
      tenant={tenant}
      anamnese={{
        id: anamnese.id,
        status: anamnese.status,
        patientId: anamnese.patientId,
        submittedAt: anamnese.submittedAt.toISOString(),
        summary: anamnese.summary ?? null,
        attentionPoints: anamnese.attentionPoints,
        patient: { name: anamnese.patient.name },
        payload: anamnese.payload as Record<string, string>,
      }}
    />
  );
}
