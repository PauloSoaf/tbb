"use client";

import Link from "next/link";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  MessageCircle,
  ShieldAlert,
  Users,
  UserX,
  Utensils,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { StorageQuotaBanner } from "@/components/dashboard/StorageQuotaBanner";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { AnamneseSummaryCard } from "@/components/dashboard/AnamneseSummaryCard";
import { AttentionBadge } from "@/components/dashboard/AttentionBadge";
import { CopyPreConsultaLink } from "@/components/dashboard/CopyPreConsultaLink";
import { TodayAppointmentsCard } from "@/components/dashboard/TodayAppointmentsCard";
import { UpcomingAppointmentsList } from "@/components/dashboard/UpcomingAppointmentsList";
import { PatientsNeedingActionList } from "@/components/dashboard/PatientsNeedingActionList";
import { UnreadMessagesPanel } from "@/components/dashboard/UnreadMessagesPanel";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { CopyPreConsultationLinkCard } from "@/components/dashboard/CopyPreConsultationLinkCard";
import { DashboardAlertsClient } from "@/components/dashboard/DashboardAlertsClient";
import { useI18n } from "@/lib/i18n/I18nContext";

type TodayAppointment = {
  id: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  mode: "ONLINE" | "PRESENTIAL";
  status: "SCHEDULED" | "DONE" | "CANCELED";
  patient: { id: string; name: string };
  careSessions: { id: string; status: string }[];
};

type PatientAction = {
  patientId: string;
  patientName: string;
  reason: string;
  recommendation: string;
  href: string;
  tone: "blue" | "amber" | "rose";
};

type MessageSummary = {
  id: string;
  body: string;
  createdAt: Date;
  patient: { id: string; name: string };
};

type AnamneseItem = {
  id: string;
  submittedAt: Date;
  status: string;
  summary: string | null;
  attentionPoints: string[];
  patient: { id: string; name: string };
};

type AttentionPointItem = {
  responseId: string;
  patientId: string;
  patientName: string;
  attentionPoints: string[];
};

type OnboardingStep = {
  done: boolean;
  label: string;
  sub: string;
  href: string;
  kind: "link" | "oauth";
};

export interface DashboardData {
  tenant: string;
  nutritionistName: string;
  nutritionistHasGoogleToken: boolean;
  googleCalendarAvailable: boolean;
  nutritionistBio?: string | null;
  nutritionistCity?: string | null;
  nutritionistProfileImageUrl?: string | null;
  stats: {
    totalPatients: number;
    newAnamneses: number;
    reviewedAnamneses: number;
    patientsWithAttention: number;
    unreadChatMessages: number;
    patientsWithoutActivePlan: number;
  };
  recentAnamneses: AnamneseItem[];
  attentionPoints: AttentionPointItem[];
  lowMoodAlerts: { patientId: string; patientName: string; mood: number }[];
  todayCheckins: { mood: number; energy: number; patient: { id: string; name: string } }[];
  patientsInactive: number;
  birthdays: { id: string; name: string; daysUntil: number }[];
  todayAppointments: TodayAppointment[];
  upcomingAppointments: TodayAppointment[];
  patientsNeedingAction: PatientAction[];
  unreadMessages: MessageSummary[];
}

export function DashboardPageClient({ data }: { data: DashboardData }) {
  const { t } = useI18n();
  const { tenant, stats, nutritionistName } = data;
  const firstName = nutritionistName.split(" ")[0];
  const onboardingSteps: OnboardingStep[] = [
    {
      done: Boolean(data.nutritionistBio && data.nutritionistCity && data.nutritionistProfileImageUrl),
      label: t("dashboard.setup.profile"),
      sub: t("dashboard.setup.profile_desc"),
      href: `/dashboard/${tenant}/config#professional-profile`,
      kind: "link",
    },
    {
      done: false,
      label: t("dashboard.setup.patient"),
      sub: t("dashboard.setup.patient_desc"),
      href: `/dashboard/${tenant}/pacientes/novo`,
      kind: "link",
    },
    {
      done: false,
      label: t("dashboard.setup.appointment"),
      sub: t("dashboard.setup.appointment_desc"),
      href: `/dashboard/${tenant}/agenda`,
      kind: "link",
    },
    {
      done: data.nutritionistHasGoogleToken,
      label: t("dashboard.setup.calendar"),
      sub: t("dashboard.setup.calendar_desc"),
      href: data.nutritionistHasGoogleToken || !data.googleCalendarAvailable
        ? `/dashboard/${tenant}/config#google-calendar`
        : "/api/auth/google",
      kind: data.nutritionistHasGoogleToken || !data.googleCalendarAvailable ? "link" : "oauth",
    },
  ];

  return (
    <>
      <DashboardHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.greeting", { name: firstName })}
      />

      <div className="space-y-6 p-4 lg:p-8">
        <StorageQuotaBanner tenant={tenant} />

        {stats.totalPatients === 0 && (
          <div className="rounded-2xl border border-border-neutral bg-card-bg p-5 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
              <div className="shrink-0 rounded-xl bg-primary p-2 text-primary-foreground">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">{t("dashboard.setup.title")}</h2>
                <p className="mt-0.5 text-sm text-text-secondary">{t("dashboard.setup.subtitle")}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {onboardingSteps.map((step) => {
                const className = `flex min-h-16 items-center gap-3 rounded-xl border p-3 transition-all ${
                  step.done
                    ? "border-success/30 bg-success/10 hover:border-success/50"
                    : "border-border-neutral bg-background hover:border-brand-blue/40 hover:bg-primary-subtle hover:shadow-sm"
                }`;
                const content = (
                  <>
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        step.done ? "bg-success" : "border-2 border-border-neutral bg-card-bg"
                      }`}
                    >
                      {step.done && <CheckCircle2 className="h-4 w-4 text-white" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${step.done ? "text-success line-through" : "text-text-primary"}`}>
                        {step.label}
                      </p>
                      <p className="truncate text-xs text-text-secondary">{step.sub}</p>
                    </div>
                  </>
                );

                return step.kind === "oauth" ? (
                  <a key={step.label} href={step.href} className={className}>
                    {content}
                  </a>
                ) : (
                  <PendingButtonLink
                    key={step.label}
                    prefetch={false}
                    href={step.href}
                    pendingLabel="Abrindo..."
                    className={className}
                  >
                    {content}
                  </PendingButtonLink>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(clamp(132px,14vw,180px),1fr))] gap-3 xl:gap-4">
          <StatsCard
            title={t("dashboard.stats.patients")}
            value={stats.totalPatients}
            icon={Users}
            color="blue"
            href={`/dashboard/${tenant}/pacientes`}
            tooltip={t("dashboard.stats.patients_tooltip")}
          />
          <StatsCard
            title={t("dashboard.stats.new_anamneses")}
            value={stats.newAnamneses}
            icon={FilePlus2}
            color="amber"
            href={`/dashboard/${tenant}/pacientes`}
            tooltip={t("dashboard.stats.new_anamneses_tooltip")}
          />
          <StatsCard
            title={t("dashboard.stats.reviewed")}
            value={stats.reviewedAnamneses}
            icon={CheckCircle2}
            color="green"
            href={`/dashboard/${tenant}/pacientes`}
            tooltip={t("dashboard.stats.reviewed_tooltip")}
          />
          <StatsCard
            title={t("dashboard.stats.appointments")}
            value={data.todayAppointments.length}
            icon={CalendarDays}
            color="purple"
            href={`/dashboard/${tenant}/agenda`}
            tooltip={t("dashboard.stats.appointments_tooltip")}
          />
          <StatsCard
            title={t("dashboard.stats.attention_points")}
            value={stats.patientsWithAttention}
            icon={ShieldAlert}
            color="rose"
            href={`/dashboard/${tenant}/pacientes`}
            tooltip={t("dashboard.stats.attention_points_tooltip")}
          />
          <StatsCard
            title={t("dashboard.stats.unread_messages")}
            value={stats.unreadChatMessages}
            icon={MessageCircle}
            color={stats.unreadChatMessages > 0 ? "blue" : "green"}
            href={`/dashboard/${tenant}/pacientes`}
            tooltip={t("dashboard.stats.unread_messages_tooltip")}
          />
          <StatsCard
            title={t("dashboard.stats.without_checkin")}
            value={data.patientsInactive}
            icon={UserX}
            color={data.patientsInactive > 0 ? "amber" : "green"}
            href={`/dashboard/${tenant}/pacientes?engagement=WITHOUT_CHECKIN`}
            tooltip={t("dashboard.stats.without_checkin_tooltip")}
          />
          <StatsCard
            title={t("dashboard.stats.without_plan")}
            value={stats.patientsWithoutActivePlan}
            icon={Utensils}
            color={stats.patientsWithoutActivePlan > 0 ? "amber" : "green"}
            href={`/dashboard/${tenant}/pacientes?engagement=WITHOUT_PLAN`}
            tooltip={t("dashboard.stats.without_plan_tooltip")}
          />
        </div>

        <DashboardAlertsClient
          tenant={tenant}
          todayCheckins={data.todayCheckins}
          birthdays={data.birthdays}
          lowMoodAlerts={data.lowMoodAlerts}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <TodayAppointmentsCard appointments={data.todayAppointments} tenant={tenant} />
            <UpcomingAppointmentsList appointments={data.upcomingAppointments} tenant={tenant} />
            <div className="xl:hidden">
              <PatientsNeedingActionList actions={data.patientsNeedingAction} tenant={tenant} />
            </div>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">{t("dashboard.sections.latest_anamneses")}</h2>
                  <p className="text-sm text-text-secondary">{t("dashboard.sections.latest_anamneses_desc")}</p>
                </div>
                <Link prefetch={false} href={`/dashboard/${tenant}/pacientes`} className="text-sm font-medium text-brand-blue transition-colors hover:text-brand-blue-hover">
                  {t("common.view_all")}
                </Link>
              </div>

              {data.recentAnamneses.length === 0 ? (
                <div className="rounded-xl border border-border-neutral bg-card-bg p-8 text-center">
                  <ClipboardList className="mx-auto mb-3 h-10 w-10 text-text-secondary/40" />
                  <p className="text-text-secondary">{t("dashboard.sections.no_anamneses")}</p>
                  <p className="mb-4 mt-1 text-sm text-text-secondary">{t("dashboard.sections.no_anamneses_desc")}</p>
                  <CopyPreConsultaLink tenantSlug={tenant} />
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentAnamneses.map((anamnese) => (
                    <AnamneseSummaryCard
                      key={anamnese.id}
                      responseId={anamnese.id}
                      patientName={anamnese.patient.name}
                      patientId={anamnese.patient.id}
                      submittedAt={anamnese.submittedAt}
                      status={anamnese.status}
                      summary={anamnese.summary}
                      attentionPoints={anamnese.attentionPoints}
                      tenantSlug={tenant}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <DashboardQuickActions tenant={tenant} />
            <div className="hidden xl:block">
              <PatientsNeedingActionList actions={data.patientsNeedingAction} tenant={tenant} />
            </div>
            <UnreadMessagesPanel messages={data.unreadMessages} tenant={tenant} />

            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-primary">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                {t("dashboard.sections.attention_points")}
              </h2>

              {data.attentionPoints.length === 0 ? (
                <div className="rounded-xl border border-border-neutral bg-card-bg p-6 text-center">
                  <p className="text-sm text-text-secondary">{t("dashboard.no_attention_points")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.attentionPoints.map((item) => (
                    <div key={item.responseId} className="rounded-xl border border-border-neutral bg-card-bg p-4">
                      <Link prefetch={false} href={`/dashboard/${tenant}/pacientes/${item.patientId}`} className="text-sm font-medium text-text-primary transition-colors hover:text-brand-blue">
                        {item.patientName}
                      </Link>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.attentionPoints.slice(0, 3).map((point, i) => (
                          <AttentionBadge key={i} text={point.split(":")[0]} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <CopyPreConsultationLinkCard tenant={tenant} />
          </div>
        </div>
      </div>
    </>
  );
}
