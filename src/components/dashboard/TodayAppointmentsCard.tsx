"use client";

import { CalendarDays } from "lucide-react";
import { AppointmentDashboardItem } from "./AppointmentDashboardItem";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { useI18n } from "@/lib/i18n/I18nContext";

type TodayAppointment = Parameters<typeof AppointmentDashboardItem>[0]["appointment"];

export function TodayAppointmentsCard({ appointments, tenant }: { appointments: TodayAppointment[]; tenant: string }) {
  const { t } = useI18n();
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{t("dashboard.sections.today_agenda")}</h2>
          <p className="text-sm text-text-secondary">{t("dashboard.sections.today_agenda_desc")}</p>
        </div>
      </div>

      {appointments.length === 0 ? (
        <DashboardEmptyState
          icon={CalendarDays}
          title={t("dashboard.no_appointments_today")}
          description={t("dashboard.no_appointments_desc")}
          actionLabel={t("dashboard.open_agenda")}
          href={`/dashboard/${tenant}/agenda`}
        />
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <AppointmentDashboardItem key={appointment.id} appointment={appointment} tenant={tenant} />
          ))}
        </div>
      )}
    </section>
  );
}
