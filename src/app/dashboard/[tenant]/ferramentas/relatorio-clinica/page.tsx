import { getPatientHref } from "@/services/patient-route.service";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { getClinicOverview, getPatientEngagementList, getMonthlyAppointments } from "@/services/clinic-report.service";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { MonthlyAppointmentsChart } from "@/components/clinic/MonthlyAppointmentsChart";
import { Users, Target, Trophy, BookOpen, TrendingUp, CalendarDays, Utensils } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  params: Promise<{ tenant: string }>;
}

export const metadata = { title: "Relatório da Clínica | NutriOpus" };

export default async function ClinicReportPage({ params }: Props) {
  const { tenant } = await params;
  const { session } = await assertTenantAccess(tenant);

  const [overview, patients, monthlyData] = await Promise.all([
    getClinicOverview(session.nutritionistId),
    getPatientEngagementList(session.nutritionistId),
    getMonthlyAppointments(session.nutritionistId),
  ]);

  const totalGoals = overview.goals.active + overview.goals.achieved + overview.goals.abandoned;
  const goalAchievePct = totalGoals > 0 ? Math.round((overview.goals.achieved / totalGoals) * 100) : 0;

  return (
    <div className="relative min-h-screen bg-surface-warm pb-20">
      <DashboardHeader
        title="Relatório da Clínica"
        subtitle="Visão geral de engajamento e resultados"
      />

      <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {[
            { label: "Pacientes ativos", value: overview.activePatients, icon: Users, color: "blue" },
            { label: "Total de pacientes", value: overview.totalPatients, icon: Users, color: "gray" },
            { label: "Atendimentos (mês)", value: overview.appointmentsThisMonth, icon: CalendarDays, color: "green" },
            { label: "Novos (mês)", value: overview.newPatientsThisMonth, icon: TrendingUp, color: "purple" },
            { label: "Planos ativos", value: overview.activeMealPlans, icon: Utensils, color: "orange" },
            { label: "Metas ativas", value: overview.goals.active, icon: Target, color: "amber" },
            { label: "Metas atingidas", value: overview.goals.achieved, icon: Trophy, color: "emerald" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card-bg border border-border-neutral rounded-xl p-3 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-1 text-${color}-500`} />
              <p className="text-2xl font-bold text-text-primary dark:text-slate-200">{value}</p>
              <p className="text-xs text-text-secondary mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Médias */}
        {(overview.avgMeasurements.weight || overview.avgMeasurements.bmi) && (
          <div className="bg-card-bg border border-border-neutral rounded-xl p-5 space-y-3">
            <h2 className="text-base font-semibold text-text-primary dark:text-slate-200">Médias recentes (últimos 30 dias)</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              {overview.avgMeasurements.weight && (
                <div>
                  <p className="text-xl font-bold text-text-primary dark:text-slate-200">{overview.avgMeasurements.weight} kg</p>
                  <p className="text-xs text-text-secondary">Peso médio</p>
                </div>
              )}
              {overview.avgMeasurements.bmi && (
                <div>
                  <p className="text-xl font-bold text-text-primary dark:text-slate-200">{overview.avgMeasurements.bmi}</p>
                  <p className="text-xs text-text-secondary">IMC médio</p>
                </div>
              )}
              {overview.avgMeasurements.bodyFatPercentage && (
                <div>
                  <p className="text-xl font-bold text-text-primary dark:text-slate-200">{overview.avgMeasurements.bodyFatPercentage}%</p>
                  <p className="text-xs text-text-secondary">% Gordura média</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metas */}
        <div className="bg-card-bg border border-border-neutral rounded-xl p-5 space-y-3">
          <h2 className="text-base font-semibold text-text-primary dark:text-slate-200">Metas dos pacientes</h2>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-4 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
              {totalGoals > 0 && (
                <>
                  <div style={{ width: `${(overview.goals.active / totalGoals) * 100}%` }} className="bg-amber-400 h-full" title="Ativas" />
                  <div style={{ width: `${(overview.goals.achieved / totalGoals) * 100}%` }} className="bg-emerald-500 h-full" title="Atingidas" />
                  <div style={{ width: `${(overview.goals.abandoned / totalGoals) * 100}%` }} className="bg-gray-300 dark:bg-slate-600 h-full" title="Abandonadas" />
                </>
              )}
            </div>
            <span className="text-sm font-semibold text-text-primary dark:text-slate-200">{goalAchievePct}% concluídas</span>
          </div>
          <div className="flex gap-4 text-xs text-text-secondary">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" />Ativas: {overview.goals.active}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />Atingidas: {overview.goals.achieved}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-300 dark:bg-slate-600 inline-block" />Abandonadas: {overview.goals.abandoned}</span>
          </div>
        </div>

        {/* Monthly appointments chart */}
        <MonthlyAppointmentsChart data={monthlyData} />

        {/* Engagement Table */}
        <div className="bg-card-bg border border-border-neutral rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border-neutral">
            <h2 className="text-base font-semibold text-text-primary dark:text-slate-200">Engajamento por Paciente</h2>
            <p className="text-xs text-text-secondary mt-0.5">Registros de diário nos últimos 30 dias · Pacientes ativos</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-warm dark:bg-card-bg">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Paciente</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Objetivo</th>
                  <th className="text-center px-4 py-3 font-medium text-text-secondary">Registros (30d)</th>
                  <th className="text-center px-4 py-3 font-medium text-text-secondary hidden md:table-cell">Check-ins (7d)</th>
                  <th className="text-center px-4 py-3 font-medium text-text-secondary">Metas ativas</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-neutral">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-warm transition-colors hover:bg-warm-beige">
                    <td className="px-4 py-3 font-medium text-text-primary dark:text-slate-200">{p.name}</td>
                    <td className="px-4 py-3 text-text-secondary truncate max-w-xs">{p.goal ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${p.diaryEntriesLast30Days >= 10 ? "text-emerald-600 dark:text-emerald-400" : p.diaryEntriesLast30Days >= 3 ? "text-amber-600 dark:text-amber-400" : "text-red-500 dark:text-red-400"}`}>
                        {p.diaryEntriesLast30Days}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span className={`font-semibold ${p.checkinLast7Days >= 5 ? "text-emerald-600 dark:text-emerald-400" : p.checkinLast7Days >= 3 ? "text-amber-600 dark:text-amber-400" : "text-red-500 dark:text-red-400"}`}>
                        {p.checkinLast7Days}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-text-secondary">{p.activeGoals}</td>
                    <td className="px-4 py-3">
                      <Link href={getPatientHref({ tenant: tenant, patient: p })} className="text-xs text-brand-blue hover:underline">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
