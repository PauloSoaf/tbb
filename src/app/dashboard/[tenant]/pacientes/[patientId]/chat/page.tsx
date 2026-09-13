import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { getPatientById } from "@/services/patient.service";
import { getNutritionistChatAction } from "@/actions/patient-portal.action";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { NutritionistChatView } from "@/components/chat/NutritionistChatView";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ tenant: string; patientId: string }>;
}

export default async function PatientChatPage({ params }: Props) {
  const { tenant, patientId: patientSlug } = await params;
  const { session } = await assertTenantAccess(tenant);
  const patientId = await resolvePatientIdFromRouteParam(session.nutritionistId, patientSlug);

  const patient = await getPatientById(session.nutritionistId, patientId);
  if (!patient) notFound();

  const { messages = [] } = await getNutritionistChatAction(tenant, patientId);

  return (
    <>
      <DashboardHeader
        title={`Chat — ${patient.name}`}
        subtitle="Troca de mensagens pelo portal"
      />
      <div className="p-4 lg:p-8 max-w-3xl">
        <Link
          href={`/dashboard/${tenant}/pacientes/${patientId}`}
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao prontuário
        </Link>
        <NutritionistChatView
          tenantSlug={tenant}
          patientId={patientId}
          initialMessages={messages}
        />
      </div>
    </>
  );
}
