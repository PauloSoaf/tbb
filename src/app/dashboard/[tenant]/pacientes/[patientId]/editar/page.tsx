import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PatientForm } from "@/components/patients/PatientForm";
import { updatePatientAction } from "@/actions/updatePatient.action";
import { getPatientById } from "@/services/patient.service";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { ArchivePatientButton } from "@/components/patients/ArchivePatientButton";
import { ArrowLeft } from "lucide-react";

interface EditPatientPageProps {
  params: Promise<{ tenant: string; patientId: string }>;
}

export default async function EditPatientPage({ params }: EditPatientPageProps) {
  const { tenant, patientId: patientSlug } = await params;
  const { session } = await assertTenantAccess(tenant);
  const patientId = await resolvePatientIdFromRouteParam(session.nutritionistId, patientSlug);

  const patient = await getPatientById(session.nutritionistId, patientId);

  if (!patient) {
    notFound();
  }

  const boundAction = updatePatientAction.bind(null, tenant, patientId);

  return (
    <>
      <DashboardHeader
        title={`Editar: ${patient.name}`}
        subtitle="Alterar dados do paciente"
      />

      <div className="p-4 lg:p-8 max-w-2xl">
        <Link
          href={`/dashboard/${tenant}/pacientes/${patientId}`}
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao paciente
        </Link>

        <div className="bg-card-bg rounded-xl border border-border-neutral p-6">
          <h2 className="text-base font-semibold text-text-primary mb-5">
            Dados do paciente
          </h2>
          <PatientForm
            action={boundAction}
            defaultValues={{
              name: patient.name,
              phone: patient.phone,
              email: patient.email ?? "",
              birthDate: patient.birthDate?.toISOString().slice(0, 10),
              gender: patient.gender,
              weight: patient.weight,
              height: patient.height,
              goal: patient.goal ?? "",
              notes: patient.notes ?? "",
              status: patient.status,
            }}
            submitLabel="Salvar alterações"
            showStatus
          />
        </div>

        {patient.status !== "ARCHIVED" && (
          <div className="bg-card-bg rounded-xl border border-rose-100 p-6 mt-6">
            <h2 className="text-base font-semibold text-rose-700 mb-1">Zona de perigo</h2>
            <p className="text-sm text-text-secondary mb-4">
              Arquivar o paciente o remove da lista ativa. Os dados são preservados e o acesso ao portal é desativado.
            </p>
            <ArchivePatientButton
              tenantSlug={tenant}
              patientId={patientId}
              patientName={patient.name}
            />
          </div>
        )}
      </div>
    </>
  );
}
