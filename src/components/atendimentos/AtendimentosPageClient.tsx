"use client";

import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useI18n } from "@/lib/i18n/I18nContext";
import { routes } from "@/lib/navigation/routes";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { Video, Clock, Plus, User } from "lucide-react";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";

type CareSession = {
  id: string;
  title: string | null;
  status: string;
  createdAt: string;
  patient: { name: string };
};

interface AtendimentosPageClientProps {
  tenant: string;
  sessions: CareSession[];
}

export function AtendimentosPageClient({ tenant, sessions }: AtendimentosPageClientProps) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? enUS : locale === "es" ? es : ptBR;

  const statusLabel: Record<string, { label: string; color: string }> = {
    SCHEDULED: { label: t("appointments.status.scheduled"), color: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400" },
    WAITING: { label: t("appointments.status.waiting"), color: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400" },
    IN_PROGRESS: { label: t("appointments.status.in_progress"), color: "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400" },
    COMPLETED: { label: t("appointments.status.completed"), color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" },
    CANCELED: { label: t("appointments.status.canceled"), color: "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400" },
    NO_SHOW: { label: t("appointments.status.no_show"), color: "bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  };

  return (
    <>
      <DashboardHeader
        title={t("appointments.title")}
        subtitle={t("appointments.subtitle")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: routes.dashboard(tenant) },
          { label: t("nav.care_sessions"), current: true },
        ]}
      />
      <div className="p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-text-secondary">
            {t("appointments.count").replace("{count}", String(sessions.length))}
          </p>
          <PendingButtonLink
            href={`/dashboard/${tenant}/atendimentos/novo`}
            pendingLabel="Abrindo..."
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("appointments.new")}
          </PendingButtonLink>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-16 text-text-secondary">
            <Video className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{t("appointments.no_sessions")}</p>
            <p className="text-sm mt-1">{t("appointments.create_session")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => {
              const st = statusLabel[s.status] ?? { label: s.status, color: "bg-gray-100 text-gray-600" };
              return (
                <PendingButtonLink
                  key={s.id}
                  href={`/dashboard/${tenant}/atendimentos/${s.id}`}
                  pendingLabel="Abrindo atendimento..."
                  className="flex min-h-[76px] items-center gap-4 p-4 bg-card-bg border border-border-neutral rounded-xl hover:bg-warm-beige dark:hover:bg-border-neutral/40 transition-colors"
                >
                  <div className="p-2 bg-brand-blue-soft rounded-lg shrink-0">
                    <Video className="w-5 h-5 text-brand-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">
                      {s.title ?? t("appointments.with_patient").replace("{name}", s.patient.name)}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {s.patient.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(s.createdAt), "dd/MM/yyyy HH:mm", { locale: dateLocale })}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${st.color}`}>
                    {st.label}
                  </span>
                </PendingButtonLink>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
