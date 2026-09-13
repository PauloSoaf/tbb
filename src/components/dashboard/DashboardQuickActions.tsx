"use client";

import {
  Bell,
  CalendarDays,
  Database,
  ExternalLink,
  FileBarChart,
  Stethoscope,
  UserPlus,
  Users,
  Utensils,
  Wrench,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";

export function DashboardQuickActions({ tenant }: { tenant: string }) {
  const { t } = useI18n();

  const actions = [
    { label: t("dashboard.actions.new_patient"), icon: UserPlus, href: (tenant: string) => `/dashboard/${tenant}/pacientes/novo` },
    { label: t("dashboard.actions.view_patients"), icon: Users, href: (tenant: string) => `/dashboard/${tenant}/pacientes` },
    { label: t("nav.agenda"), icon: CalendarDays, href: (tenant: string) => `/dashboard/${tenant}/agenda` },
    { label: t("dashboard.actions.new_appointment"), icon: Stethoscope, href: (tenant: string) => `/dashboard/${tenant}/atendimentos/novo` },
    { label: t("nav.plan_studio"), icon: Utensils, href: (tenant: string) => `/dashboard/${tenant}/ferramentas/oficina-planos` },
    { label: "TACO", icon: Database, href: (tenant: string) => `/dashboard/${tenant}/ferramentas/taco` },
    { label: "Relatorios", icon: FileBarChart, href: (tenant: string) => `/dashboard/${tenant}/ferramentas/relatorio-clinica` },
    { label: "Lembretes", icon: Bell, href: (tenant: string) => `/dashboard/${tenant}/lembretes` },
    { label: t("nav.tools"), icon: Wrench, href: (tenant: string) => `/dashboard/${tenant}/ferramentas` },
    { label: t("nav.public_page"), icon: ExternalLink, href: (tenant: string) => `/${tenant}`, external: true },
  ];

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-text-primary">{t("dashboard.sections.quick_actions")}</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <PendingButtonLink
              key={action.label}
              href={action.href(tenant)}
              target={action.external ? "_blank" : undefined}
              pendingLabel="Abrindo..."
              className="flex items-center gap-3 rounded-xl border border-border-neutral bg-card-bg p-3 transition-all duration-200 hover:border-brand-blue/30 hover:shadow-md"
            >
              <Icon className="h-5 w-5 shrink-0 text-brand-blue" />
              <span className="text-sm font-medium text-text-primary">{action.label}</span>
            </PendingButtonLink>
          );
        })}
      </div>
    </section>
  );
}
