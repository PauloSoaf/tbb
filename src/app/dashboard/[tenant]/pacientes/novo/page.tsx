import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PatientForm } from "@/components/patients/PatientForm";
import { createPatientAction } from "@/actions/createPatient.action";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface NewPatientPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function NewPatientPage({ params }: NewPatientPageProps) {
  const { tenant } = await params;
  await assertTenantAccess(tenant);

  const boundAction = createPatientAction.bind(null, tenant);

  return (
    <>
      <DashboardHeader title="Novo Paciente" subtitle="Cadastro manual" />

      <div className="p-4 lg:p-8 max-w-2xl">
        <Link
          href={`/dashboard/${tenant}/pacientes`}
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar aos pacientes
        </Link>

        <div className="bg-card-bg rounded-xl border border-border-neutral p-6">
          <h2 className="text-base font-semibold text-text-primary mb-5">
            Dados do paciente
          </h2>
          <PatientForm action={boundAction} submitLabel="Cadastrar paciente" />
        </div>
      </div>
    </>
  );
}
