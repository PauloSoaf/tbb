"use client";

import Link from "next/link";
import { AppointmentDashboardItem } from "./AppointmentDashboardItem";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { CalendarClock } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

type UpcomingAppointment = Parameters<typeof AppointmentDashboardItem>[0]["appointment"];

export function UpcomingAppointmentsList({ appointments, tenant }: { appointments: UpcomingAppointment[]; tenant: string }) {
  const { t } = useI18n();
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{t("dashboard.sections.upcoming_appointments")}</h2>
          <p className="text-sm text-text-secondary">{t("dashboard.sections.upcoming_appointments_desc")}</p>
        </div>
        <Link prefetch={false} href={`/dashboard/${tenant}/agenda`} className="text-sm font-medium text-brand-blue hover:text-brand-blue-hover">
          {t("dashboard.view_in_calendar")}
        </Link>
      </div>

      {appointments.length === 0 ? (
        <DashboardEmptyState
          icon={CalendarClock}
          title={t("dashboard.no_upcoming_appointments")}
          description={t("dashboard.no_upcoming_appointments_desc")}
          actionLabel={t("dashboard.open_agenda")}
          href={`/dashboard/${tenant}/agenda`}
        />
      ) : (
        <div className="space-y-2">
          {appointments.map((appointment) => (
            <AppointmentDashboardItem key={appointment.id} appointment={appointment} tenant={tenant} compact />
          ))}
        </div>
      )}
    </section>
  );
}
