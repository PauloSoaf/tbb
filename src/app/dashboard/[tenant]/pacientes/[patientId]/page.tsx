import { Suspense } from "react";
import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPatientById, getPatientWellnessCheckins } from "@/services/patient.service";
import { getLatestPatientMeasurement, getFirstPatientMeasurement, getAnthropometryEvolutionData } from "@/services/patient-measurement.service";
import { assertTenantAccess } from "@/lib/tenancy/assertTenantAccess";
import { getPatientTimeline } from "@/services/patient-timeline.service";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { routes } from "@/lib/navigation/routes";
import { PatientStickyHeader } from "@/components/patients/timeline/PatientStickyHeader";
import { ProntuarioTimeline } from "@/components/patients/timeline/ProntuarioTimeline";
import { PatientProntuarioComposer } from "@/components/patients/timeline/PatientProntuarioComposer";
import { QuickNoteInput } from "@/components/patients/timeline/QuickNoteInput";
import { getPatientGoals, getPatientReminders } from "@/services/goals.service";
import { getRecentMealPlanSummary } from "@/services/meal-plan.service";
import { getActiveShoppingList } from "@/services/shopping-list.service";
import { GoalsPanel } from "@/components/goals/GoalsPanel";
import { PatientRecordPageLayout } from "@/components/patient-record/PatientRecordPageLayout";
import { PatientClinicalAside } from "@/components/patient-record/PatientClinicalAside";
import { WeightSparklineCard } from "@/components/patients/WeightSparklineCard";
import { BMISparklineCard } from "@/components/patients/BMISparklineCard";
import { BodyFatSparklineCard } from "@/components/patients/BodyFatSparklineCard";
import { TagManager } from "@/components/patients/TagManager";
import { PortalAccountManager } from "@/components/patients/PortalAccountManager";
import { PatientShoppingListSummaryCard } from "@/components/patients/shopping-list/PatientShoppingListSummaryCard";
import { PatientOverviewQuickCards } from "@/components/patients/PatientOverviewQuickCards";
import { PatientBodySkeleton } from "@/components/skeletons/PatientBodySkeleton";
import Link from "next/link";
import { MessageCircle, TrendingUp, Utensils, Smile, CalendarDays, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { genderLabel } from "@/lib/utils/gender-label";
import { PatientRealtimeTranscriptionHistory } from "@/components/patient-record/transcriptions/PatientRealtimeTranscriptionHistory";
import { getTenantSubscriptionContext } from "@/lib/billing/subscription-context";

interface PatientDetailPageProps {
  params: Promise<{ tenant: string; patientId: string }>;
}

export default async function PatientDetailPage({
  params,
}: PatientDetailPageProps) {
  const { tenant, patientId: patientSlug } = await params;
  const access = await assertTenantAccess(tenant);
  const { session } = access;
  const canViewTranscriptionsByRole =
    access.isOwner || access.permissions.has("transcription.view");
  const subscription = canViewTranscriptionsByRole
    ? await getTenantSubscriptionContext(session.nutritionistId)
    : null;
  const canViewTranscriptions =
    canViewTranscriptionsByRole &&
    subscription?.featureLimits["transcription.history.enabled"]?.enabled !== false;
  const patientId = await resolvePatientIdFromRouteParam(session.nutritionistId, patientSlug);

  // Minimal data for shell: patient info + latest measurement for sticky header
  const [patient, latestMeasurement] = await Promise.all([
    getPatientById(session.nutritionistId, patientId),
    getLatestPatientMeasurement(session.nutritionistId, patientId),
  ]);

  if (!patient) {
    notFound();
  }

  return (
    <div className="relative min-h-screen bg-surface-warm pb-20">
      {/* Shell renders immediately after patient lookup (~fast) */}
      <DashboardHeader
        title="Pacientes"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard(tenant) },
          { label: "Pacientes", href: routes.patients(tenant) },
          { label: patient.name, current: true },
        ]}
        backButton={{ href: routes.patients(tenant), label: "Voltar para Pacientes" }}
      />

      <PatientStickyHeader
        patient={patient}
        latestMeasurement={latestMeasurement}
        tenantSlug={tenant}
      />

      {/* Heavy body content streams in while user sees the shell above */}
      <Suspense fallback={<PatientBodySkeleton />}>
        <PatientBodyContent
          nutritionistId={session.nutritionistId}
          patientId={patientId}
          patientRouteParam={patientSlug}
          patient={patient}
          tenant={tenant}
          latestMeasurement={latestMeasurement}
          canViewTranscriptions={canViewTranscriptions}
          canDeleteTranscriptions={
            canViewTranscriptions &&
            (access.isOwner || access.permissions.has("transcription.delete"))
          }
          canExportTranscriptions={
            canViewTranscriptions &&
            (access.isOwner || access.permissions.has("transcription.export")) &&
            subscription?.featureLimits["transcription.export.enabled"]?.enabled !==
              false
          }
          canAttachTranscriptions={
            canViewTranscriptions &&
            (access.isOwner ||
              access.permissions.has("transcription.attachToMedicalRecord")) &&
            subscription?.featureLimits["transcription.attach.enabled"]?.enabled !==
              false
          }
        />
      </Suspense>
    </div>
  );
}

interface PatientBodyContentProps {
  nutritionistId: string;
  patientId: string;
  patientRouteParam: string;
  patient: NonNullable<Awaited<ReturnType<typeof getPatientById>>>;
  tenant: string;
  latestMeasurement: Awaited<ReturnType<typeof getLatestPatientMeasurement>>;
  canViewTranscriptions: boolean;
  canDeleteTranscriptions: boolean;
  canExportTranscriptions: boolean;
  canAttachTranscriptions: boolean;
}

function PatientClinicalFocusCards({
  tenant,
  patientRouteParam,
  anamneseCount,
  latestAnamnese,
  measurementCount,
  latestMeasurement,
}: {
  tenant: string;
  patientRouteParam: string;
  anamneseCount: number;
  latestAnamnese: { id: string; status: string; submittedAt: Date; updatedAt: Date } | null;
  measurementCount: number;
  latestMeasurement: Awaited<ReturnType<typeof getLatestPatientMeasurement>>;
}) {
  return (
    <PatientOverviewQuickCards
      tenant={tenant}
      patientRouteParam={patientRouteParam}
      anamneseCount={anamneseCount}
      latestAnamneseDate={latestAnamnese ? latestAnamnese.submittedAt.toISOString() : null}
      measurementCount={measurementCount}
      latestMeasurementDate={latestMeasurement ? latestMeasurement.measuredAt.toISOString() : null}
    />
  );
}

async function PatientBodyContent({
  nutritionistId,
  patientId,
  patientRouteParam,
  patient,
  tenant,
  latestMeasurement,
  canViewTranscriptions,
  canDeleteTranscriptions,
  canExportTranscriptions,
  canAttachTranscriptions,
}: PatientBodyContentProps) {
  const [
    firstMeasurement,
    timelineEvents,
    initialGoals,
    initialReminders,
    wellnessCheckins,
    portalAccount,
    nextAppointment,
    doneAppointmentsCount,
    anthropometryEvolution,
    patientTags,
    recentMealPlans,
    activeShoppingList,
    latestAnamnese,
    anamneseCount,
    realtimeTranscriptions,
  ] = await Promise.all([
    getFirstPatientMeasurement(nutritionistId, patientId),
    getPatientTimeline(nutritionistId, patientId).catch(() => []),
    getPatientGoals(nutritionistId, patientId).catch(() => []),
    getPatientReminders(nutritionistId, patientId).catch(() => []),
    getPatientWellnessCheckins(nutritionistId, patientId, 7).catch(() => []),
    prisma.patientAccount.findUnique({
      where: { patientId },
      select: { status: true, activatedAt: true, lastLoginAt: true },
    }).catch(() => null),
    prisma.appointment.findFirst({
      where: { patientId, nutritionistId, status: "SCHEDULED", date: { gte: new Date() } },
      orderBy: { date: "asc" },
      select: { id: true, date: true, startTime: true, mode: true },
    }).catch(() => null),
    prisma.appointment.count({
      where: { patientId, nutritionistId, status: "DONE" },
    }).catch(() => 0),
    getAnthropometryEvolutionData(nutritionistId, patientId).catch(() => []),
    prisma.patientTag.findMany({
      where: { nutritionistId, patientId },
      select: { id: true, label: true, color: true },
      orderBy: { createdAt: "asc" },
    }).catch(() => []),
    getRecentMealPlanSummary(nutritionistId, patientId).catch(() => []),
    getActiveShoppingList({ nutritionistId, patientId }).catch(() => null),
    prisma.anamneseResponse.findFirst({
      where: { patientId, nutritionistId },
      orderBy: { submittedAt: "desc" },
      select: { id: true, status: true, submittedAt: true, updatedAt: true },
    }).catch(() => null),
    prisma.anamneseResponse.count({
      where: { patientId, nutritionistId },
    }).catch(() => 0),
    canViewTranscriptions
      ? prisma.appointmentTranscript.findMany({
          where: { patientId, tenantId: nutritionistId, status: "SAVED" },
          include: {
            segments: {
              orderBy: [{ startedAtMs: "asc" }, { createdAt: "asc" }],
            },
            savedBy: { select: { name: true, email: true } },
          },
          orderBy: { savedAt: "desc" },
          take: 20,
        }).catch(() => [])
      : Promise.resolve([]),
  ]);

  const daysOnTrackComputed = Math.floor((new Date().getTime() - new Date(patient.createdAt).getTime()) / 86400000);

  const main = (
    <div className="space-y-6">
      <PatientClinicalFocusCards
        tenant={tenant}
        patientRouteParam={patientRouteParam}
        anamneseCount={anamneseCount}
        latestAnamnese={latestAnamnese}
        measurementCount={anthropometryEvolution.length}
        latestMeasurement={latestMeasurement}
      />

      <PatientProntuarioComposer
        patientId={patientId}
        patientName={patient.name}
      />

      <QuickNoteInput patientId={patientId} />

      <PatientRealtimeTranscriptionHistory
        tenantSlug={tenant}
        transcriptions={JSON.parse(JSON.stringify(realtimeTranscriptions))}
        canDelete={canDeleteTranscriptions}
        canExport={canExportTranscriptions}
        canAttach={canAttachTranscriptions}
      />

      <div className="bg-card-bg rounded-3xl p-6 shadow-sm border border-border-neutral">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-text-primary">Historico do prontuario</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Evolucao, condutas, consultas, medidas, planos e documentos relevantes.
          </p>
        </div>
        <ProntuarioTimeline
          events={timelineEvents}
          tenantSlug={tenant}
          patientId={patientId}
        />
      </div>
    </div>
  );

  const clinicalAside = (
    <PatientClinicalAside>
      <GoalsPanel
          tenantSlug={tenant}
          patientId={patientId}
          initialGoals={initialGoals}
          initialReminders={initialReminders}
        />

        <TagManager
          tenantSlug={tenant}
          patientId={patientId}
          initialTags={patientTags}
        />

        {recentMealPlans.length > 0 && (
          <div className="bg-card-bg rounded-3xl p-5 shadow-sm border border-border-neutral">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
                <Utensils className="w-4 h-4 text-brand-blue" />
                Planos Alimentares
              </h3>
              <Link
                prefetch={false}
                href={`/dashboard/${tenant}/pacientes/${patientId}/planos`}
                className="text-xs text-brand-blue hover:underline font-medium"
              >
                Ver todos
              </Link>
            </div>
            <div className="space-y-2">
              {recentMealPlans.map((plan) => (
                <Link
                  prefetch={false}
                  key={plan.id}
                  href={`/dashboard/${tenant}/pacientes/${patientId}/planos/${plan.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-surface-warm hover:bg-warm-beige transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate group-hover:text-brand-blue transition-colors">
                      {plan.title}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {plan.totalCalories} kcal · {format(new Date(plan.createdAt), "MMM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <span className={`ml-2 shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                    plan.status === "ACTIVE"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : plan.status === "DRAFT"
                      ? "bg-gray-100 text-gray-600 dark:bg-card-bg dark:text-slate-400"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  }`}>
                    {plan.status === "ACTIVE" ? "Ativo" : plan.status === "DRAFT" ? "Rascunho" : "Arquivado"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <PatientShoppingListSummaryCard
          tenantSlug={tenant}
          patientId={patientId}
          list={activeShoppingList}
        />

        {nextAppointment && (
          <div className="bg-brand-blue/5 dark:bg-brand-blue/10 rounded-3xl p-5 shadow-sm border border-brand-blue/20">
            <h3 className="font-semibold text-brand-blue mb-2 flex items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4" />
              Próxima Consulta
            </h3>
            <p className="text-base font-bold text-text-primary">
              {format(new Date(nextAppointment.date), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
            </p>
            <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
              {nextAppointment.startTime && <span>{nextAppointment.startTime}</span>}
              <span>{nextAppointment.mode === "ONLINE" ? "Online" : "Presencial"}</span>
            </div>
          </div>
        )}

        <div className="bg-card-bg rounded-3xl p-6 shadow-sm border border-border-neutral">
          <h3 className="font-semibold text-text-primary mb-4">Informações de Contato</h3>
          <div className="space-y-3 text-sm text-text-secondary">
            <p><span className="font-medium text-text-primary">Email:</span> {patient.email || "Não informado"}</p>
            <p><span className="font-medium text-text-primary">Telefone:</span> {patient.phone}</p>
            <p><span className="font-medium text-text-primary">Sexo:</span> {genderLabel(patient.gender)}</p>
            <p><span className="font-medium text-text-primary">Objetivo:</span> {patient.goal || "Não definido"}</p>
          </div>
          {patient.phone && (() => {
            const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/portal/${tenant}/login`;
            const msg = encodeURIComponent(`Olá ${patient.name.split(" ")[0]}! Acesse seu portal do paciente em: ${portalUrl}\n\nE-mail: ${patient.email || "Seu e-mail"}\nSenha padrão: 123456`);
            const digits = patient.phone.replace(/\D/g, "");
            const wa = `https://wa.me/55${digits}?text=${msg}`;
            return (
              <a href={wa} target="_blank" rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium transition-colors border border-emerald-200 dark:border-emerald-800"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar link do portal via WhatsApp
              </a>
            );
          })()}
        </div>

        <PortalAccountManager
          tenantSlug={tenant}
          patientId={patientId}
          patientEmail={patient.email}
          daysOnTrack={daysOnTrackComputed}
          doneAppointmentsCount={doneAppointmentsCount}
          portalAccount={portalAccount}
        />

        {patient.notes && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-3xl p-6 shadow-sm border border-amber-100 dark:border-amber-800">
            <h3 className="font-semibold text-amber-900 dark:text-amber-400 mb-2">Alerta Clínico / Observações Iniciais</h3>
            <p className="text-sm text-amber-800 dark:text-amber-300 whitespace-pre-wrap">{patient.notes}</p>
          </div>
        )}

        <WeightSparklineCard measurements={anthropometryEvolution} />
        <BMISparklineCard measurements={anthropometryEvolution} />
        <BodyFatSparklineCard measurements={anthropometryEvolution} gender={patient.gender} />

        {firstMeasurement && latestMeasurement && firstMeasurement.measuredAt !== latestMeasurement.measuredAt && (() => {
          const weightDiff = firstMeasurement.weight && latestMeasurement.weight
            ? +(latestMeasurement.weight - firstMeasurement.weight).toFixed(1) : null;
          const fatDiff = firstMeasurement.bodyFatPercentage && latestMeasurement.bodyFatPercentage
            ? +(latestMeasurement.bodyFatPercentage - firstMeasurement.bodyFatPercentage).toFixed(1) : null;
          if (weightDiff === null && fatDiff === null) return null;
          return (
            <div className="bg-card-bg rounded-3xl p-6 shadow-sm border border-border-neutral">
              <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-blue" />
                Comparativo Inicial → Atual
              </h3>
              <div className="space-y-3">
                {weightDiff !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Peso</span>
                    <div className={`flex items-center gap-1 font-semibold ${weightDiff < 0 ? "text-emerald-600 dark:text-emerald-400" : weightDiff > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
                      {weightDiff < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : weightDiff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                      {weightDiff > 0 ? "+" : ""}{weightDiff} kg
                    </div>
                  </div>
                )}
                {fatDiff !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">% Gordura</span>
                    <div className={`flex items-center gap-1 font-semibold ${fatDiff < 0 ? "text-emerald-600 dark:text-emerald-400" : fatDiff > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}`}>
                      {fatDiff < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : fatDiff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                      {fatDiff > 0 ? "+" : ""}{fatDiff}%
                    </div>
                  </div>
                )}
                <p className="text-xs text-text-secondary pt-1">
                  desde {format(new Date(firstMeasurement.measuredAt), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          );
        })()}

        {(() => {
          if (wellnessCheckins.length === 0) return null;
          const today = new Date(); today.setUTCHours(0,0,0,0);
          const checkinDateSet = new Set(wellnessCheckins.map((c) => new Date(c.date).toISOString().slice(0,10)));
          const avgMood = wellnessCheckins.reduce((s,c) => s+c.mood,0) / wellnessCheckins.length;
          const avgEnergy = wellnessCheckins.reduce((s,c) => s+c.energy,0) / wellnessCheckins.length;
          const moodEmojis = ["","😢","😕","😐","😊","😁"];
          const energyEmojis = ["","🪫","😴","😌","⚡","🔥"];
          const engagementLevel = wellnessCheckins.length >= 5 ? "Alta" : wellnessCheckins.length >= 3 ? "Média" : "Baixa";
          const engagementColor = wellnessCheckins.length >= 5 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : wellnessCheckins.length >= 3 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
          return (
            <div className="bg-card-bg rounded-3xl p-6 shadow-sm border border-border-neutral">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <Smile className="w-4 h-4 text-yellow-500" />
                  Check-ins de Bem-estar
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${engagementColor}`}>
                  {engagementLevel}
                </span>
              </div>
              <div className="flex gap-1 mb-2">
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(today); d.setDate(d.getDate() - (6-i));
                  const key = d.toISOString().slice(0,10);
                  const done = checkinDateSet.has(key);
                  return <div key={key} title={format(d,"dd/MM",{locale:ptBR})} className={`flex-1 h-1.5 rounded-full ${done ? "bg-brand-blue" : "bg-border-neutral"}`} />;
                })}
              </div>
              <div className="flex items-center gap-4 text-sm text-text-secondary mb-3">
                <span>{wellnessCheckins.length}/7 dias</span>
                <span>Humor médio: {moodEmojis[Math.round(avgMood)]}</span>
                <span>Energia: {energyEmojis[Math.round(avgEnergy)]}</span>
              </div>
              <div className="space-y-1.5">
                {wellnessCheckins.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 text-sm py-1 border-b border-border-neutral last:border-0">
                    <span className="text-xs text-text-secondary w-12 shrink-0">
                      {format(new Date(c.date), "dd/MM", { locale: ptBR })}
                    </span>
                    <span>{moodEmojis[c.mood] ?? "😐"}</span>
                    <span>{energyEmojis[c.energy] ?? "😌"}</span>
                    {c.sleep != null && (
                      <span className="text-xs text-text-secondary">{c.sleep}h</span>
                    )}
                    {c.notes && (
                      <span className="text-xs text-text-secondary truncate flex-1">{c.notes}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

    </PatientClinicalAside>
  );

  return (
    <PatientRecordPageLayout
      tenant={tenant}
      patient={{ id: patient.id, name: patient.name, email: patient.email }}
      main={main}
      clinicalAside={clinicalAside}
    />
  );
}
