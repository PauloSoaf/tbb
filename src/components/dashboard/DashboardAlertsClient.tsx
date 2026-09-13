"use client";

import { CheckCircle2, Cake, Frown } from "lucide-react";
import { getPatientHref } from "@/services/patient-route.service";
import { useI18n } from "@/lib/i18n/I18nContext";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";

interface DashboardAlertsProps {
  tenant: string;
  todayCheckins: { mood: number; energy: number; patient: { id: string; name: string } }[];
  birthdays: { id: string; name: string; daysUntil: number }[];
  lowMoodAlerts: { patientId: string; patientName: string; mood: number }[];
}

export function DashboardAlertsClient({ tenant, todayCheckins, birthdays, lowMoodAlerts }: DashboardAlertsProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      {todayCheckins.length > 0 && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              {t("dashboard.alerts.checkins", { count: todayCheckins.length })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {todayCheckins.map((c) => (
              <PendingButtonLink
                prefetch={false}
                key={c.patient.id}
                href={getPatientHref({ tenant, patient: c.patient })}
                pendingLabel={c.patient.name}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-card-bg dark:text-emerald-400 dark:hover:bg-emerald-500/10"
              >
                {c.patient.name}
              </PendingButtonLink>
            ))}
          </div>
        </div>
      )}

      {birthdays.length > 0 && (
        <div className="rounded-xl border border-pink-100 bg-pink-50 p-4 dark:border-pink-500/20 dark:bg-pink-500/10">
          <div className="mb-2 flex items-center gap-2">
            <Cake className="h-4 w-4 shrink-0 text-pink-500 dark:text-pink-400" />
            <p className="text-sm font-semibold text-pink-700 dark:text-pink-400">
              {t("dashboard.alerts.birthdays")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {birthdays.map((b) => (
              <PendingButtonLink
                prefetch={false}
                key={b.id}
                href={getPatientHref({ tenant, patient: b })}
                pendingLabel={b.name}
                className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-white px-3 py-1 text-xs text-pink-700 transition-colors hover:bg-pink-50 dark:border-pink-500/20 dark:bg-card-bg dark:text-pink-400 dark:hover:bg-pink-500/10"
              >
                {b.name}{" "}
                {b.daysUntil === 0
                  ? t("dashboard.alerts.today")
                  : b.daysUntil === 1
                  ? t("dashboard.alerts.tomorrow")
                  : t("dashboard.alerts.in_days", { days: b.daysUntil })}
              </PendingButtonLink>
            ))}
          </div>
        </div>
      )}

      {lowMoodAlerts.length > 0 && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
          <div className="mb-2 flex items-center gap-2">
            <Frown className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {t("dashboard.alerts.low_mood", { count: lowMoodAlerts.length })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowMoodAlerts.map((a) => (
              <PendingButtonLink
                prefetch={false}
                key={a.patientId}
                href={`/dashboard/${tenant}/pacientes/${a.patientId}`}
                pendingLabel={a.patientName}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1 text-xs text-red-700 transition-colors hover:bg-red-50 dark:border-red-500/20 dark:bg-card-bg dark:text-red-400 dark:hover:bg-red-500/10"
              >
                {a.patientName}
              </PendingButtonLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
