"use client";

import { getPatientHref } from "@/services/patient-route.service";
import { isSameDay } from "date-fns";
import { CalendarDays, ExternalLink, MapPin, User, Video } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nContext";
import { formatDateByLocale } from "@/lib/i18n/formatters";

type DashboardAppointment = {
  id: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  mode: "ONLINE" | "PRESENTIAL";
  status: "SCHEDULED" | "DONE" | "CANCELED";
  patient: { id: string; name: string };
  careSessions: { id: string; status: string }[];
};

export function AppointmentDashboardItem({
  appointment,
  tenant,
  compact = false,
}: {
  appointment: DashboardAppointment;
  tenant: string;
  compact?: boolean;
}) {
  const { t, locale } = useI18n();
  const careSession = appointment.careSessions[0];
  const time = appointment.startTime ?? t("dashboard.appointments.free_time");
  const agendaHref = `/dashboard/${tenant}/agenda?date=${new Date(appointment.date).toISOString().split("T")[0]}`;
  const patientHref = getPatientHref({ tenant: tenant, patient: appointment.patient });
  const status = getAppointmentStatus(appointment, t);
  const ModeIcon = appointment.mode === "ONLINE" ? Video : MapPin;

  return (
    <article className="rounded-xl border border-border-neutral bg-card-bg p-4 transition-all duration-200 hover:border-brand-blue/30 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex min-w-14 flex-col items-center rounded-xl bg-surface-warm px-2.5 py-2 text-center">
          <span className="text-base font-bold tabular-nums text-text-primary">{time}</span>
          {!compact && (
            <span className="mt-0.5 text-[11px] font-medium uppercase text-text-secondary">
              {formatDateByLocale(appointment.date, locale)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-text-primary">{appointment.patient.name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-text-secondary">
            <ModeIcon className="h-3.5 w-3.5" />
            {appointment.mode === "ONLINE" ? t("dashboard.appointments.online") : t("dashboard.appointments.in_person")}
            {appointment.endTime ? ` ${t("common.until")} ${appointment.endTime}` : ""}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link prefetch={false} href={patientHref} className="inline-flex items-center gap-1 rounded-md border border-border-neutral px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-brand-blue/40 hover:text-brand-blue">
              <User className="h-3.5 w-3.5" />
              {t("dashboard.open_patient")}
            </Link>
            <Link prefetch={false} href={agendaHref} className="inline-flex items-center gap-1 rounded-md border border-border-neutral px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-brand-blue/40 hover:text-brand-blue">
              <CalendarDays className="h-3.5 w-3.5" />
              {t("dashboard.view_in_calendar")}
            </Link>
            {appointment.mode === "ONLINE" && careSession && (
              <Link prefetch={false} href={`/dashboard/${tenant}/atendimentos/${careSession.id}`} className="inline-flex items-center gap-1 rounded-md bg-brand-blue px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-blue-hover">
                <ExternalLink className="h-3.5 w-3.5" />
                {t("dashboard.open_care_session")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function getAppointmentStatus(appointment: DashboardAppointment, t: (key: string) => string) {
  if (appointment.status === "DONE") {
    return { label: t("dashboard.appointments.status.done"), className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" };
  }
  if (appointment.status === "CANCELED") {
    return { label: t("dashboard.appointments.status.canceled"), className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" };
  }
  if (!isSameDay(new Date(appointment.date), new Date())) {
    return { label: t("dashboard.appointments.status.scheduled"), className: "bg-brand-blue-soft text-brand-blue dark:bg-blue-500/10 dark:text-blue-300" };
  }

  const [hour = "0", minute = "0"] = (appointment.startTime ?? "00:00").split(":");
  const appointmentTime = new Date(appointment.date);
  appointmentTime.setHours(Number(hour), Number(minute), 0, 0);
  const diffMinutes = (appointmentTime.getTime() - Date.now()) / 60000;

  if (diffMinutes < -90) return { label: t("dashboard.appointments.status.late"), className: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" };
  if (diffMinutes <= 15 && diffMinutes >= -15) return { label: t("dashboard.appointments.status.now"), className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" };
  if (diffMinutes > 15 && diffMinutes <= 120) return { label: t("dashboard.appointments.status.soon"), className: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" };
  return { label: t("dashboard.appointments.status.today"), className: "bg-brand-blue-soft text-brand-blue dark:bg-blue-500/10 dark:text-blue-300" };
}
