"use client";

import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { AppointmentStatusButtons } from "@/components/appointments/AppointmentStatusButtons";
import { AppointmentEditModal } from "@/components/appointments/AppointmentEditModal";
import { CalendarMonthView } from "@/components/appointments/CalendarMonthView";
import { SyncCalendarButton } from "@/components/appointments/SyncCalendarButton";
import { useI18n } from "@/lib/i18n/I18nContext";
import { routes } from "@/lib/navigation/routes";
import { format, isToday, isTomorrow } from "date-fns";
import { ptBR, enUS, es as esLocale } from "date-fns/locale";
import { CalendarDays, Video, MapPin, Plus, List, Grid, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getPatientHref } from "@/services/patient-route.service";

type AppointmentWithCareSession = {
  id: string;
  date: Date;
  startTime: string | null;
  endTime?: string | null;
  notes?: string | null;
  status: string;
  mode: string;
  patient: { id: string; name: string; portalEnabled: boolean };
  careSessions: { id: string }[];
};

interface AgendaPageClientProps {
  tenant: string;
  nutritionistId: string;
  offset: number;
  isMonthView: boolean;
  baseDate: string; // ISO string
  weekStart: string; // ISO string
  appointments: AppointmentWithCareSession[];
  patients: { id: string; name: string }[];
  preselectedPatientId?: string;
}

const statusColors: Record<string, string> = {
  SCHEDULED: "bg-brand-blue-soft text-brand-blue dark:bg-brand-blue/20 dark:text-blue-400",
  DONE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  CANCELED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 line-through",
};

export function AgendaPageClient({
  tenant,
  nutritionistId,
  offset,
  isMonthView,
  baseDate: baseDateStr,
  weekStart: weekStartStr,
  appointments,
  patients,
  preselectedPatientId,
}: AgendaPageClientProps) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? enUS : locale === "es" ? esLocale : ptBR;

  const baseDate = new Date(baseDateStr);
  const weekStart = new Date(weekStartStr);

  const label = isMonthView
    ? format(baseDate, "MMMM 'de' yyyy", { locale: dateLocale }).replace(/^./, (str) => str.toUpperCase())
    : offset === 0
    ? t("agenda.this_week")
    : offset === 1
    ? t("agenda.next_week")
    : offset === -1
    ? t("agenda.last_week")
    : `${t("agenda.week_of")} ${format(weekStart, "dd/MM", { locale: dateLocale })}`;

  function getDayLabel(date: Date) {
    if (isToday(date)) return t("dashboard.today");
    if (isTomorrow(date)) return t("dashboard.tomorrow");
    return format(date, "EEEE, dd/MM", { locale: dateLocale });
  }

  const byDay = new Map<string, typeof appointments>();
  if (!isMonthView) {
    for (const appt of appointments) {
      const key = format(new Date(appt.date), "yyyy-MM-dd");
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(appt);
    }
  }

  const totalCount = appointments.length;
  const scheduledCount = appointments.filter((a) => a.status === "SCHEDULED").length;
  const doneCount = appointments.filter((a) => a.status === "DONE").length;
  const canceledCount = appointments.filter((a) => a.status === "CANCELED").length;

  return (
    <>
      <DashboardHeader
        title={t("nav.agenda")}
        subtitle={label}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: routes.dashboard(tenant) },
          { label: t("nav.agenda"), current: true },
        ]}
      />

      <div className="p-4 lg:p-8">
        {totalCount > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: t("agenda.total"), value: totalCount, color: "text-text-primary" },
              { label: t("agenda.scheduled"), value: scheduledCount, color: "text-brand-blue" },
              { label: t("agenda.done"), value: doneCount, color: "text-emerald-600" },
              { label: t("agenda.canceled"), value: canceledCount, color: "text-gray-400" },
            ].map(({ label: kpiLabel, value, color }) => (
              <div key={kpiLabel} className="bg-card-bg rounded-xl border border-border-neutral p-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-text-secondary mt-0.5">{kpiLabel}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-card-bg p-1 rounded-lg border border-border-neutral w-max">
                <Link
                  href={`/dashboard/${tenant}/agenda?view=week`}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    !isMonthView ? "bg-brand-blue text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("agenda.week")}</span>
                </Link>
                <Link
                  href={`/dashboard/${tenant}/agenda?view=month`}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isMonthView ? "bg-brand-blue text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Grid className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("agenda.month")}</span>
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <SyncCalendarButton tenantSlug={tenant} nutritionistId={nutritionistId} />
                <Link
                  href={`/dashboard/${tenant}/agenda?view=${isMonthView ? "month" : "week"}&offset=${offset - 1}`}
                  className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary
                    bg-card-bg border border-border-neutral rounded-lg hover:shadow-sm transition-all"
                >
                  ← {t("agenda.previous")}
                </Link>
                {offset !== 0 && (
                  <Link
                    href={`/dashboard/${tenant}/agenda?view=${isMonthView ? "month" : "week"}`}
                    className="px-3 py-1.5 text-xs font-medium text-brand-blue
                      bg-brand-blue-soft rounded-lg transition-all"
                  >
                    {t("dashboard.today")}
                  </Link>
                )}
                <Link
                  href={`/dashboard/${tenant}/agenda?view=${isMonthView ? "month" : "week"}&offset=${offset + 1}`}
                  className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary
                    bg-card-bg border border-border-neutral rounded-lg hover:shadow-sm transition-all"
                >
                  {t("agenda.next")} →
                </Link>
              </div>
            </div>

            {isMonthView ? (
              <CalendarMonthView
                tenantSlug={tenant}
                baseDate={baseDate}
                appointments={appointments as Parameters<typeof CalendarMonthView>[0]["appointments"]}
              />
            ) : appointments.length === 0 ? (
              <div className="bg-card-bg rounded-xl border border-border-neutral p-10 text-center">
                <CalendarDays className="w-10 h-10 text-text-secondary/30 mx-auto mb-3" />
                <p className="text-text-secondary">{t("agenda.no_appointments_week")}</p>
                <p className="text-sm text-text-secondary mt-1">{t("agenda.use_form_to_schedule")}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Array.from(byDay.entries()).map(([dateKey, dayAppts]) => (
                  <div key={dateKey}>
                    <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3 capitalize">
                      {getDayLabel(new Date(dateKey + "T12:00:00"))}
                    </h3>
                    <div className="space-y-3">
                      {dayAppts.map((appt) => (
                        <div
                          key={appt.id}
                          className={`bg-card-bg rounded-xl border border-border-neutral p-4
                            ${appt.status === "CANCELED" ? "opacity-60" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link
                                  href={getPatientHref({ tenant, patient: appt.patient })}
                                  className="font-medium text-text-primary hover:text-brand-blue transition-colors"
                                >
                                  {appt.patient.name}
                                </Link>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    statusColors[appt.status] ?? statusColors.SCHEDULED
                                  }`}
                                >
                                  {appt.status === "SCHEDULED"
                                    ? t("dashboard.appointments.status.scheduled")
                                    : appt.status === "DONE"
                                    ? t("dashboard.appointments.status.done")
                                    : t("dashboard.appointments.status.canceled")}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-sm text-text-secondary">
                                <span>
                                  {appt.startTime ?? ""}
                                  {appt.endTime ? ` – ${appt.endTime}` : ""}
                                </span>
                                <span className="flex items-center gap-1">
                                  {appt.mode === "ONLINE" ? (
                                    <>
                                      <Video className="w-3.5 h-3.5" /> {t("dashboard.appointments.online")}
                                    </>
                                  ) : (
                                    <>
                                      <MapPin className="w-3.5 h-3.5" /> {t("dashboard.appointments.in_person")}
                                    </>
                                  )}
                                </span>
                              </div>
                              {appt.notes && (
                                <p className="text-xs text-text-secondary mt-1.5 italic">{appt.notes}</p>
                              )}
                            </div>
                            <div className="shrink-0 flex items-center gap-1 flex-wrap justify-end">
                              {appt.mode === "ONLINE" && appt.status === "SCHEDULED" && (() => {
                                const careSession = appt.careSessions[0];
                                const href = careSession
                                  ? `/dashboard/${tenant}/atendimentos/${careSession.id}`
                                  : `/dashboard/${tenant}/atendimentos`;
                                return (
                                  <Link
                                    href={href}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 text-violet-700 dark:text-violet-400 text-xs font-medium rounded-lg transition-colors"
                                    title={careSession ? t("agenda.enter_online_room") : t("agenda.go_to_sessions")}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {t("agenda.room")}
                                  </Link>
                                );
                              })()}
                              {appt.status === "SCHEDULED" && (
                                <AppointmentEditModal
                                  tenantSlug={tenant}
                                  appointment={{
                                    id: appt.id,
                                    date: new Date(appt.date).toISOString(),
                                    startTime: appt.startTime,
                                    endTime: appt.endTime ?? null,
                                    mode: appt.mode as "ONLINE" | "PRESENTIAL",
                                    notes: appt.notes ?? null,
                                  }}
                                />
                              )}
                              <AppointmentStatusButtons
                                tenantSlug={tenant}
                                appointmentId={appt.id}
                                currentStatus={appt.status}
                                existingNotes={appt.notes}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="bg-card-bg rounded-xl border border-border-neutral p-5 sticky top-6">
              <h2 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-blue" />
                {t("agenda.new_appointment")}
              </h2>
              {patients.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-text-secondary mb-3">{t("agenda.no_patients_yet")}</p>
                  <Link
                    href={`/dashboard/${tenant}/pacientes/novo`}
                    className="text-sm font-medium text-brand-blue hover:text-brand-blue-hover"
                  >
                    {t("agenda.register_first_patient")}
                  </Link>
                </div>
              ) : (
                <Suspense fallback={<div className="h-40 animate-pulse bg-gray-100 rounded-lg" />}>
                  <AppointmentForm
                    tenantSlug={tenant}
                    patients={patients}
                    defaultPatientId={preselectedPatientId}
                  />
                </Suspense>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
