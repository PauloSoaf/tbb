import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { getCareSessions } from "@/services/care-session.service";
import { AtendimentosPageClient } from "@/components/atendimentos/AtendimentosPageClient";

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function AtendimentosPage({ params }: Props) {
  const { tenant } = await params;
  const { session } = await assertTenantAccess(tenant);
  const sessions = await getCareSessions(session.nutritionistId);

  return (
    <AtendimentosPageClient
      tenant={tenant}
      sessions={sessions.map((s) => ({
        id: s.id,
        title: s.title ?? null,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        patient: { name: s.patient.name },
      }))}
    />
  );
}
