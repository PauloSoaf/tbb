"use client";

import { Users, Activity, FileWarning, CalendarClock } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface PatientsStatsGridProps {
  stats: {
    totalPatients: number;
    activePatients: number;
    patientsWithoutPlan: number;
    patientsWithUpcomingAppointments: number;
  };
}

export function PatientsStatsGrid({ stats }: PatientsStatsGridProps) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total */}
      <div className="bg-card-bg rounded-2xl p-4 border border-border-neutral shadow-sm flex flex-col justify-between">
        <div className="flex items-center gap-2 text-text-secondary mb-2">
          <Users className="w-4 h-4" />
          <span className="text-xs font-medium">{t("patients_list.stats_total", { defaultValue: "Total de Pacientes" })}</span>
        </div>
        <p className="text-2xl font-semibold text-text-primary">{stats.totalPatients}</p>
      </div>

      {/* Ativos */}
      <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-800/30 shadow-sm flex flex-col justify-between">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 mb-2">
          <Activity className="w-4 h-4" />
          <span className="text-xs font-medium">{t("patients_list.stats_active", { defaultValue: "Ativos" })}</span>
        </div>
        <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">{stats.activePatients}</p>
      </div>

      {/* Sem Plano */}
      <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-4 border border-amber-100 dark:border-amber-800/30 shadow-sm flex flex-col justify-between">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 mb-2">
          <FileWarning className="w-4 h-4" />
          <span className="text-xs font-medium">{t("patients_list.stats_without_plan", { defaultValue: "Sem Plano Ativo" })}</span>
        </div>
        <p className="text-2xl font-semibold text-amber-700 dark:text-amber-400">{stats.patientsWithoutPlan}</p>
      </div>

      {/* Consulta Futura */}
      <div className="bg-brand-blue/5 dark:bg-brand-blue/10 rounded-2xl p-4 border border-brand-blue/10 dark:border-brand-blue/20 shadow-sm flex flex-col justify-between">
        <div className="flex items-center gap-2 text-brand-blue mb-2">
          <CalendarClock className="w-4 h-4" />
          <span className="text-xs font-medium">{t("patients_list.stats_upcoming", { defaultValue: "Próximas Consultas" })}</span>
        </div>
        <p className="text-2xl font-semibold text-brand-blue dark:text-blue-400">{stats.patientsWithUpcomingAppointments}</p>
      </div>
    </div>
  );
}
