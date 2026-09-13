import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { Metadata } from "next";
import Link from "next/link";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { getMealPlansByPatient } from "@/services/meal-plan.service";
import { getPatientById } from "@/services/patient.service";
import { Plus, Calendar, Info } from "lucide-react";
import { PatientBreadcrumbs } from "@/components/layout/PatientBreadcrumbs";
import { AppBackButton } from "@/components/navigation/AppBackButton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const metadata: Metadata = { title: "Planos Alimentares" };

export default async function MealPlansPage({
  params,
}: {
  params: Promise<{ tenant: string; patientId: string }>;
}) {
  const { tenant, patientId: patientSlug } = await params;
  const { nutritionist } = await assertTenantAccess(tenant);
  const patientId = await resolvePatientIdFromRouteParam(nutritionist.id, patientSlug);

  const patient = await getPatientById(nutritionist.id, patientId);
  if (!patient) return <div>Paciente não encontrado</div>;

  const plans = await getMealPlansByPatient(nutritionist.id, patientId);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <AppBackButton
          href={`/dashboard/${tenant}/pacientes/${patientSlug}`}
          label={`Voltar para ${patient.name}`}
        />
        <PatientBreadcrumbs tenantSlug={tenant} patient={patient} currentRoute="Planos Alimentares" />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Planos Alimentares</h1>
          <p className="text-sm text-text-secondary">{patient.name}</p>
        </div>
        <Link
          href={`/dashboard/${tenant}/pacientes/${patientSlug}/planos/novo`}
          className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-brand-hover transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Plano
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-border-neutral p-12 text-center">
          <Calendar className="w-12 h-12 text-text-secondary mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-medium text-text-primary mb-2">Nenhum plano alimentar</h2>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Este paciente ainda não possui nenhum plano alimentar cadastrado. Crie o primeiro plano para organizar a dieta.
          </p>
          <Link
            href={`/dashboard/${tenant}/pacientes/${patientSlug}/planos/novo`}
            className="inline-flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-brand-hover transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Criar Primeiro Plano
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={`/dashboard/${tenant}/pacientes/${patientId}/planos/${plan.id}`}
              className="bg-white rounded-xl border border-border-neutral p-5 hover:border-brand-blue hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-text-primary group-hover:text-brand-blue transition-colors line-clamp-1" title={plan.title}>
                  {plan.title}
                </h3>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  plan.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                  plan.status === "DRAFT" ? "bg-gray-100 text-gray-700" :
                  "bg-orange-100 text-orange-700"
                }`}>
                  {plan.status === "ACTIVE" ? "Ativo" : plan.status === "DRAFT" ? "Rascunho" : "Arquivado"}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-text-secondary">
                {plan.objective && (
                  <p className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    <span className="line-clamp-1">{plan.objective}</span>
                  </p>
                )}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border-neutral">
                  <div>
                    <p className="text-xs font-semibold text-text-secondary uppercase">Kcal</p>
                    <p className="font-bold text-text-primary">{plan.totalCalories}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-secondary uppercase">Data</p>
                    <p className="font-medium text-text-primary">
                      {format(new Date(plan.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
