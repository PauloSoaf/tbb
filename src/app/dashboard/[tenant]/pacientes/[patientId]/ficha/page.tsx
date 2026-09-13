import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { notFound } from "next/navigation";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/meal-plans/PrintButton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { calculateAge } from "@/lib/utils/calculateAge";
import { genderLabel } from "@/lib/utils/gender-label";

export const metadata = { title: "Ficha Clínica" };

interface Props {
  params: Promise<{ tenant: string; patientId: string }>;
}

export default async function FichaPage({ params }: Props) {
  const { tenant, patientId: patientSlug } = await params;
  const { nutritionist } = await assertTenantAccess(tenant);
  const patientId = await resolvePatientIdFromRouteParam(nutritionist.id, patientSlug);

  const [patient, latestMeasurement, firstMeasurement, activeGoals, anamneseResponse, activeMealPlan] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: patientId, nutritionistId: nutritionist.id },
      select: {
        name: true, email: true, phone: true, birthDate: true, gender: true,
        goal: true, createdAt: true,
      },
    }),
    prisma.patientMeasurement.findFirst({
      where: { patientId, nutritionistId: nutritionist.id },
      orderBy: { measuredAt: "desc" },
      select: { weight: true, height: true, bmi: true, bodyFatPercentage: true, waist: true, hip: true, measuredAt: true },
    }),
    prisma.patientMeasurement.findFirst({
      where: { patientId, nutritionistId: nutritionist.id },
      orderBy: { measuredAt: "asc" },
      select: { weight: true, bodyFatPercentage: true, bmi: true, measuredAt: true },
    }),
    prisma.patientGoal.findMany({
      where: { patientId, nutritionistId: nutritionist.id, status: "ACTIVE" },
      select: { title: true, type: true, targetValue: true, currentValue: true, targetUnit: true },
      take: 5,
    }),
    prisma.anamneseResponse.findFirst({
      where: { patientId, nutritionistId: nutritionist.id, summary: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { summary: true, createdAt: true },
    }),
    prisma.mealPlan.findFirst({
      where: { patientId, nutritionistId: nutritionist.id, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      select: { title: true, totalCalories: true, totalProtein: true, totalCarbs: true, totalFat: true, startDate: true },
    }),
  ]);

  if (!patient) notFound();

  const age = patient.birthDate ? calculateAge(new Date(patient.birthDate)) : null;
  const generatedAt = new Date();

  return (
    <div className="bg-white min-h-screen text-gray-900 p-8 md:p-12 print:p-6">
      <PrintButton />

      <div className="max-w-3xl mx-auto print:max-w-none">
        {/* Header */}
        <div className="border-b-2 border-blue-600 pb-4 mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">Ficha Clínica</h1>
            <p className="text-sm text-gray-500 mt-0.5">NutriOpus · {nutritionist.name}</p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>Gerado em {format(generatedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
        </div>

        {/* Patient Info */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase text-blue-600 tracking-wide mb-3">Dados do Paciente</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Nome completo</p>
              <p className="font-semibold">{patient.name}</p>
            </div>
            {patient.birthDate && (
              <div>
                <p className="text-gray-500 text-xs">Data de nascimento</p>
                <p className="font-semibold">
                  {format(new Date(patient.birthDate), "dd/MM/yyyy", { locale: ptBR })}
                  {age !== null && <span className="text-gray-500 font-normal"> ({age} anos)</span>}
                </p>
              </div>
            )}
            {patient.phone && (
              <div>
                <p className="text-gray-500 text-xs">Telefone</p>
                <p className="font-semibold">{patient.phone}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500 text-xs">Sexo</p>
              <p className="font-semibold">{genderLabel(patient.gender)}</p>
            </div>
            {patient.email && (
              <div>
                <p className="text-gray-500 text-xs">E-mail</p>
                <p className="font-semibold">{patient.email}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500 text-xs">Em acompanhamento desde</p>
              <p className="font-semibold">{format(new Date(patient.createdAt), "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>
          </div>
          {patient.goal && (
            <div className="mt-3">
              <p className="text-gray-500 text-xs">Objetivo declarado</p>
              <p className="font-medium text-sm">{patient.goal}</p>
            </div>
          )}
        </div>

        {/* Measurements */}
        {latestMeasurement && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold uppercase text-blue-600 tracking-wide mb-3">
              Última Avaliação Antropométrica
              <span className="text-gray-400 font-normal normal-case ml-2">
                ({format(new Date(latestMeasurement.measuredAt), "dd/MM/yyyy", { locale: ptBR })})
              </span>
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm">
              {[
                { label: "Peso", value: latestMeasurement.weight ? `${latestMeasurement.weight} kg` : "—" },
                { label: "Altura", value: latestMeasurement.height ? `${latestMeasurement.height} cm` : "—" },
                { label: "IMC", value: latestMeasurement.bmi ? `${Number(latestMeasurement.bmi).toFixed(1)}` : "—" },
                { label: "% Gordura", value: latestMeasurement.bodyFatPercentage ? `${Number(latestMeasurement.bodyFatPercentage).toFixed(1)}%` : "—" },
                { label: "Cintura", value: latestMeasurement.waist ? `${latestMeasurement.waist} cm` : "—" },
                { label: "Quadril", value: latestMeasurement.hip ? `${latestMeasurement.hip} cm` : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-2.5 text-center border border-gray-100">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-bold text-gray-900 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goals */}
        {activeGoals.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold uppercase text-blue-600 tracking-wide mb-3">Metas Ativas</h2>
            <div className="space-y-2">
              {activeGoals.map((g, i) => (
                <div key={i} className="flex items-center gap-3 text-sm border-b border-gray-100 pb-2">
                  <div className="w-4 h-4 rounded-full border-2 border-blue-400 shrink-0" />
                  <span className="flex-1">{g.title}</span>
                  {g.targetValue != null && (
                    <span className="text-gray-500 text-xs">
                      {g.currentValue ?? 0} / {g.targetValue} {g.targetUnit ?? ""}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Anamnese summary */}
        {anamneseResponse?.summary && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold uppercase text-blue-600 tracking-wide mb-3">
              Resumo de Anamnese
              <span className="text-gray-400 font-normal normal-case ml-2">
                ({format(new Date(anamneseResponse.createdAt), "dd/MM/yyyy", { locale: ptBR })})
              </span>
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100">
              {anamneseResponse.summary}
            </p>
          </div>
        )}

        {/* Active meal plan */}
        {activeMealPlan && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold uppercase text-blue-600 tracking-wide mb-3">Plano Alimentar Ativo</h2>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <p className="font-semibold text-gray-900 mb-3">{activeMealPlan.title}</p>
              <div className="grid grid-cols-4 gap-3 text-sm">
                {[
                  { label: "Energia", value: `${Math.round(activeMealPlan.totalCalories)} kcal` },
                  { label: "Proteínas", value: `${Math.round(activeMealPlan.totalProtein)} g` },
                  { label: "Carboidratos", value: `${Math.round(activeMealPlan.totalCarbs)} g` },
                  { label: "Gorduras", value: `${Math.round(activeMealPlan.totalFat)} g` },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-bold text-gray-900 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {activeMealPlan.startDate && (
                <p className="text-xs text-gray-400 mt-2">
                  Vigente desde {format(new Date(activeMealPlan.startDate), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* First vs latest comparison */}
        {firstMeasurement && latestMeasurement &&
          firstMeasurement.measuredAt.toString() !== latestMeasurement.measuredAt.toString() && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold uppercase text-blue-600 tracking-wide mb-3">Evolução Clínica</h2>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[
                {
                  label: "Peso",
                  first: firstMeasurement.weight != null ? `${firstMeasurement.weight} kg` : "—",
                  latest: latestMeasurement.weight != null ? `${latestMeasurement.weight} kg` : "—",
                  diff: firstMeasurement.weight != null && latestMeasurement.weight != null
                    ? +(latestMeasurement.weight - firstMeasurement.weight).toFixed(1) : null,
                },
                {
                  label: "% Gordura",
                  first: firstMeasurement.bodyFatPercentage != null ? `${firstMeasurement.bodyFatPercentage.toFixed(1)}%` : "—",
                  latest: latestMeasurement.bodyFatPercentage != null ? `${latestMeasurement.bodyFatPercentage.toFixed(1)}%` : "—",
                  diff: firstMeasurement.bodyFatPercentage != null && latestMeasurement.bodyFatPercentage != null
                    ? +(latestMeasurement.bodyFatPercentage - firstMeasurement.bodyFatPercentage).toFixed(1) : null,
                },
                {
                  label: "IMC",
                  first: firstMeasurement.bmi != null ? `${Number(firstMeasurement.bmi).toFixed(1)}` : "—",
                  latest: latestMeasurement.bmi != null ? `${Number(latestMeasurement.bmi).toFixed(1)}` : "—",
                  diff: firstMeasurement.bmi != null && latestMeasurement.bmi != null
                    ? +(Number(latestMeasurement.bmi) - Number(firstMeasurement.bmi)).toFixed(1) : null,
                },
              ].map(({ label, first, latest, diff }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(firstMeasurement.measuredAt), "MM/yyyy", { locale: ptBR })}
                  </p>
                  <p className="font-medium text-gray-700 text-sm">{first}</p>
                  <div className="my-1 text-gray-300">↓</div>
                  <p className="text-xs text-gray-400">
                    {format(new Date(latestMeasurement.measuredAt), "MM/yyyy", { locale: ptBR })}
                  </p>
                  <p className="font-bold text-gray-900 text-sm">{latest}</p>
                  {diff !== null && (
                    <p className={`text-xs mt-1 font-semibold ${diff < 0 ? "text-emerald-600" : diff > 0 ? "text-rose-600" : "text-gray-500"}`}>
                      {diff > 0 ? "+" : ""}{diff}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature */}
        <div className="mt-12 pt-6 border-t border-gray-200 grid grid-cols-2 gap-8 text-sm">
          <div>
            <div className="h-10 border-b border-gray-400 mb-1" />
            <p className="text-gray-500 text-xs">{nutritionist.name}</p>
            {nutritionist.crn && <p className="text-gray-400 text-xs">CRN: {nutritionist.crn}</p>}
          </div>
          <div>
            <div className="h-10 border-b border-gray-400 mb-1" />
            <p className="text-gray-500 text-xs">Assinatura do Paciente</p>
          </div>
        </div>
      </div>
    </div>
  );
}
