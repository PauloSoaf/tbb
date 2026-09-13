import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { AdherenceReport } from "@/components/reports/AdherenceReport";
import { AdherenceChart } from "@/components/reports/AdherenceChart";
import { getAdherenceReport } from "@/services/adherence.service";
import { subDays } from "date-fns";
import Link from "next/link";

interface Props {
  params: Promise<{ tenant: string; patientId: string }>;
  searchParams: Promise<{ days?: string }>;
}

export const metadata = { title: "Relatório de Adesão | NutriOpus" };

export default async function AdherenceReportPage({ params, searchParams }: Props) {
  const { tenant, patientId: patientSlug } = await params;
  const { days: daysParam } = await searchParams;
  const { session } = await assertTenantAccess(tenant);
  const patientId = await resolvePatientIdFromRouteParam(session.nutritionistId, patientSlug);

  const days = Math.min(parseInt(daysParam ?? "14") || 14, 90);
  const to = new Date();
  const from = subDays(to, days - 1);

  const [patient, goals, calorieReport] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: patientId, nutritionistId: session.nutritionistId },
      select: { name: true },
    }),
    prisma.patientGoal.findMany({
      where: { patientId, nutritionistId: session.nutritionistId },
      include: { checkIns: true },
    }),
    getAdherenceReport(patientId, session.nutritionistId, from, to),
  ]);

  if (!patient) notFound();

  const mappedGoals = goals.map((g) => ({
    ...g,
    status: g.status as "ACTIVE" | "ACHIEVED" | "ABANDONED",
  }));

  return (
    <div className="relative min-h-screen bg-surface-warm pb-20">
      <DashboardHeader
        title="Relatório de Adesão"
        subtitle="Engajamento com metas e adesão ao plano alimentar"
      />
      <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-8 pt-8">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-text-primary">Adesão ao Plano Alimentar</h2>
          <div className="flex gap-2">
            {[7, 14, 30].map((d) => (
              <Link
                key={d}
                href={`?days=${d}`}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${days === d ? "bg-brand-blue text-white border-brand-blue" : "border-border-neutral text-text-secondary hover:bg-warm-beige"}`}
              >
                {d} dias
              </Link>
            ))}
          </div>
          <AdherenceChart
            data={calorieReport.dailyBreakdown}
            avgAdherencePct={calorieReport.avgAdherencePct}
            daysLogged={calorieReport.daysLogged}
            totalDays={calorieReport.totalDays}
            plannedAvgCalories={calorieReport.plannedAvgCalories}
            loggedAvgCalories={calorieReport.loggedAvgCalories}
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-text-primary">Metas e Check-ins</h2>
          <AdherenceReport patient={patient} goals={mappedGoals} />
        </div>
      </div>
    </div>
  );
}
