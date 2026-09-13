import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { prisma } from "@/lib/prisma";
import { NewCareSessionForm } from "./NewCareSessionForm";

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function NovoAtendimentoPage({ params }: Props) {
  const { tenant } = await params;
  const { session } = await assertTenantAccess(tenant);

  const patients = await prisma.patient.findMany({
    where: { nutritionistId: session.nutritionistId, status: "ACTIVE" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <DashboardHeader title="Novo Atendimento" subtitle="Configure a sala de consulta online" />
      <div className="p-4 lg:p-8 max-w-xl">
        <NewCareSessionForm tenantSlug={tenant} patients={patients} />
      </div>
    </>
  );
}
