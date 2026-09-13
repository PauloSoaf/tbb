"use client";

import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useI18n } from "@/lib/i18n/I18nContext";
import { routes } from "@/lib/navigation/routes";
import Link from "next/link";
import {
  ArrowLeftRight,
  BarChart3,
  Calculator,
  ChevronRight,
  Database,
  FileBox,
  Smile,
  Utensils,
} from "lucide-react";

interface FerramentasPageClientProps {
  tenant: string;
}

export function FerramentasPageClient({ tenant }: FerramentasPageClientProps) {
  const { t } = useI18n();

  const tools = [
    {
      id: "calculadoras",
      name: t("tools.calculators.title"),
      description: t("tools.calculators.desc"),
      icon: Calculator,
      href: `/dashboard/${tenant}/ferramentas/calculadoras`,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-500/10",
    },
    {
      id: "taco",
      name: t("tools.taco.title"),
      description: t("tools.taco.desc"),
      icon: Database,
      href: `/dashboard/${tenant}/ferramentas/taco`,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
    },
    {
      id: "modelos",
      name: t("tools.templates.title"),
      description: t("tools.templates.desc"),
      icon: FileBox,
      href: `/dashboard/${tenant}/ferramentas/modelos`,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-500/10",
    },
    {
      id: "relatorio-clinica",
      name: t("tools.clinic_report.title"),
      description: t("tools.clinic_report.desc"),
      icon: BarChart3,
      href: `/dashboard/${tenant}/ferramentas/relatorio-clinica`,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-500/10",
    },
    {
      id: "oficina-planos",
      name: t("tools.plan_studio.title"),
      description: t("tools.plan_studio.desc"),
      icon: Utensils,
      href: `/dashboard/${tenant}/ferramentas/oficina-planos`,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-500/10",
    },
    {
      id: "bem-estar",
      name: t("tools.wellness_panel.title"),
      description: t("tools.wellness_panel.desc"),
      icon: Smile,
      href: `/dashboard/${tenant}/ferramentas/bem-estar`,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-50 dark:bg-yellow-500/10",
    },
    {
      id: "comparar-pacientes",
      name: t("tools.compare_patients.title"),
      description: t("tools.compare_patients.desc"),
      icon: ArrowLeftRight,
      href: `/dashboard/${tenant}/ferramentas/comparar-pacientes`,
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-50 dark:bg-cyan-500/10",
    },
  ];

  return (
    <>
      <DashboardHeader
        title={t("nav.tools")}
        subtitle={t("tools.subtitle")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: routes.dashboard(tenant) },
          { label: t("nav.tools"), current: true },
        ]}
      />

      <div className="p-4 lg:p-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.id}
                href={tool.href}
                prefetch={true}
                className="group flex flex-col bg-card-bg rounded-xl border border-border-neutral p-6 hover:shadow-md hover:border-brand-blue/40 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className={`w-12 h-12 ${tool.bg} ${tool.color} rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-105`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{tool.name}</h3>
                <p className="text-sm text-text-secondary flex-1">{tool.description}</p>
                <div className="flex items-center gap-1 text-sm font-medium text-brand-blue dark:text-blue-400 mt-4 group-hover:translate-x-1 transition-transform">
                  {t("tools.access")}
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
