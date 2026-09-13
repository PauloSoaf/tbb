import Link from "next/link";
import { differenceInCalendarDays, format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeftRight,
  CalendarDays,
  CheckCircle2,
  Download,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { ComparisonNavigationForm } from "./ComparisonNavigationForm";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { prisma } from "@/lib/prisma";
import { calculateAge } from "@/lib/utils/calculateAge";
import { genderLabel } from "@/lib/utils/gender-label";
import { formatNullableNumber } from "@/lib/utils/format-nullable-number";

interface Props {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ patientA?: string; patientB?: string }>;
}

type ComparePatient = Awaited<ReturnType<typeof getComparePatient>>;

export const metadata = { title: "Comparar Pacientes | NutriOpus" };

async function getComparePatient(nutritionistId: string, patientId: string) {
  const thirtyDaysAgo = subDays(new Date(), 30);
  const sevenDaysAgo = subDays(new Date(), 7);
  sevenDaysAgo.setUTCHours(0, 0, 0, 0);

  const [patient, measurements, doneAppointments, diaryEntries, checkins, activeGoals, achievedGoals, activePlans] =
    await Promise.all([
      prisma.patient.findFirst({
        where: { id: patientId, nutritionistId },
        select: {
          id: true,
          name: true,
          goal: true,
          birthDate: true,
          gender: true,
          createdAt: true,
        },
      }),
      prisma.patientMeasurement.findMany({
        where: { patientId, nutritionistId },
        orderBy: { measuredAt: "desc" },
        take: 2,
        select: { weight: true, bmi: true, bodyFatPercentage: true, measuredAt: true },
      }),
      prisma.appointment.count({
        where: { patientId, nutritionistId, status: "DONE" },
      }),
      prisma.foodDiaryEntry.count({
        where: { patientId, nutritionistId, loggedAt: { gte: thirtyDaysAgo } },
      }),
      prisma.wellnessCheckin.count({
        where: { patientId, nutritionistId, date: { gte: sevenDaysAgo } },
      }),
      prisma.patientGoal.count({
        where: { patientId, nutritionistId, status: "ACTIVE" },
      }),
      prisma.patientGoal.count({
        where: { patientId, nutritionistId, status: "ACHIEVED" },
      }),
      prisma.mealPlan.count({
        where: { patientId, nutritionistId, status: "ACTIVE", isTemplate: false },
      }),
    ]);

  if (!patient) return null;

  const latestMeasurement = measurements[0] ?? null;
  const previousMeasurement = measurements[1] ?? null;
  const weightDiff = latestMeasurement?.weight != null && previousMeasurement?.weight != null
    ? Number((latestMeasurement.weight - previousMeasurement.weight).toFixed(1))
    : null;

  return {
    patient,
    latestMeasurement,
    weightDiff,
    doneAppointments,
    diaryEntries,
    checkins,
    activeGoals,
    achievedGoals,
    activePlans,
  };
}

function PatientCompareCard({ data }: { data: NonNullable<ComparePatient> }) {
  const age = data.patient.birthDate ? calculateAge(data.patient.birthDate) : null;
  const daysOnTrack = differenceInCalendarDays(new Date(), data.patient.createdAt);
  const weightTone = data.weightDiff == null
    ? "text-slate-500 dark:text-slate-400"
    : data.weightDiff < 0
      ? "text-emerald-600 dark:text-emerald-400"
      : data.weightDiff > 0
        ? "text-rose-600 dark:text-rose-400"
        : "text-slate-500 dark:text-slate-400";

  return (
    <section className="bg-card-bg border border-border-neutral rounded-xl p-5 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-text-primary dark:text-slate-200">{data.patient.name}</h2>
        <p className="text-sm text-text-secondary mt-1">{data.patient.goal ?? "Objetivo não definido"}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Metric label="Idade" value={age == null ? "Sem dado" : `${age} anos`} />
        <Metric label="Sexo" value={genderLabel(data.patient.gender)} />
        <Metric label="Acompanhamento" value={`${daysOnTrack} dias`} />
        <Metric label="Planos ativos" value={data.activePlans} icon={Utensils} />
      </div>

      <div className="rounded-xl bg-surface-warm dark:bg-card-bg p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-text-secondary">Peso atual</p>
            <p className="text-2xl font-bold text-text-primary dark:text-slate-200 mt-1">
              {formatNullableNumber(data.latestMeasurement?.weight, " kg")}
            </p>
          </div>
          {data.weightDiff != null && (
            <div className={`flex items-center gap-1 text-sm font-semibold ${weightTone}`}>
              {data.weightDiff < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              {data.weightDiff > 0 ? "+" : ""}{data.weightDiff.toFixed(1)} kg
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <Metric label="IMC" value={formatNullableNumber(data.latestMeasurement?.bmi)} icon={Scale} />
          <Metric label="% gordura" value={formatNullableNumber(data.latestMeasurement?.bodyFatPercentage, "%")} />
        </div>
        {data.latestMeasurement?.measuredAt && (
          <p className="text-xs text-text-secondary mt-3">
            Última avaliação em {format(new Date(data.latestMeasurement.measuredAt), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Metric label="Consultas feitas" value={data.doneAppointments} icon={CalendarDays} />
        <Metric label="Diário 30d" value={data.diaryEntries} />
        <Metric label="Check-ins 7d" value={data.checkins} icon={CheckCircle2} />
        <Metric label="Metas ativas" value={data.activeGoals} icon={Target} />
        <Metric label="Metas atingidas" value={data.achievedGoals} icon={Target} />
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon?: typeof Scale;
}) {
  return (
    <div className="rounded-lg border border-border-neutral bg-card-bg px-3 py-2">
      <p className="text-xs text-text-secondary flex items-center gap-1">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </p>
      <p className="font-semibold text-text-primary dark:text-slate-200 mt-1">{value}</p>
    </div>
  );
}

export default async function ComparePatientsPage({ params, searchParams }: Props) {
  const { tenant } = await params;
  const { patientA, patientB } = await searchParams;
  const { session } = await assertTenantAccess(tenant);

  const patients = await prisma.patient.findMany({
    where: { nutritionistId: session.nutritionistId, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 200,
  });

  const [left, right] = await Promise.all([
    patientA ? getComparePatient(session.nutritionistId, patientA) : null,
    patientB ? getComparePatient(session.nutritionistId, patientB) : null,
  ]);

  return (
    <div className="relative min-h-screen bg-surface-warm pb-20">
      <DashboardHeader
        title="Comparar Pacientes"
        subtitle="Veja evolução, engajamento e metas em duas colunas"
      />

      <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
        <ComparisonNavigationForm>
          <PatientSelect name="patientA" label="Paciente 1" patients={patients} defaultValue={patientA} />
          <PatientSelect name="patientB" label="Paciente 2" patients={patients} defaultValue={patientB} />
        </ComparisonNavigationForm>

        {left && right ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <a
                href={`/api/export/csv?type=patient-comparison&patientA=${left.patient.id}&patientB=${right.patient.id}`}
                download
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border-neutral bg-card-bg text-sm font-medium text-text-secondary hover:text-brand-blue hover:border-brand-blue/40 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </a>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <PatientCompareCard data={left} />
              <PatientCompareCard data={right} />
            </div>
          </div>
        ) : (
          <div className="bg-card-bg border border-dashed border-border-neutral rounded-xl p-8 text-center">
            <ArrowLeftRight className="w-10 h-10 mx-auto text-brand-blue mb-3" />
            <h2 className="font-semibold text-text-primary dark:text-slate-200">Escolha dois pacientes</h2>
            <p className="text-sm text-text-secondary mt-1 max-w-md mx-auto">
              Compare peso, metas, check-ins, diário alimentar e consultas para apoiar decisões clínicas.
            </p>
          </div>
        )}

        {(patientA && !left) || (patientB && !right) ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            Um dos pacientes selecionados não foi encontrado neste tenant.
          </p>
        ) : null}

        <Link href={`/dashboard/${tenant}/ferramentas`} className="inline-flex text-sm text-text-secondary hover:text-brand-blue">
          Voltar para ferramentas
        </Link>
      </div>
    </div>
  );
}

function PatientSelect({
  name,
  label,
  patients,
  defaultValue,
}: {
  name: string;
  label: string;
  patients: { id: string; name: string }[];
  defaultValue?: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium text-text-primary dark:text-slate-200">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-lg border border-border-neutral bg-card-bg px-3 py-2.5 text-sm text-text-primary dark:text-slate-200 outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
      >
        <option value="">Selecione</option>
        {patients.map((patient) => (
          <option key={patient.id} value={patient.id}>
            {patient.name}
          </option>
        ))}
      </select>
    </label>
  );
}
