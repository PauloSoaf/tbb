"use client";

import { Activity, ClipboardList, Eye } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { PendingButtonLink } from "@/components/navigation/PendingButtonLink";

type PatientActionVariant = "report" | "measurements" | "view";

const actionConfig = {
  report: {
    labelKey: "patients_list.action_anamneses",
    shortLabelKey: "patients_list.action_anamneses_short",
    icon: ClipboardList,
    tone: "secondary",
  },
  measurements: {
    labelKey: "patients_list.action_measurements",
    shortLabelKey: "patients_list.action_measurements_short",
    icon: Activity,
    tone: "secondary",
  },
  view: {
    labelKey: "patients_list.action_view",
    shortLabelKey: "patients_list.action_view_short",
    icon: Eye,
    tone: "primary",
  },
} satisfies Record<PatientActionVariant, {
  labelKey: string;
  shortLabelKey: string;
  icon: typeof Eye;
  tone: "primary" | "secondary";
}>;

export function PatientActionLink({
  href,
  variant,
  compact = false,
  className = "",
}: {
  href: string;
  variant: PatientActionVariant;
  compact?: boolean;
  className?: string;
}) {
  const config = actionConfig[variant];
  const Icon = config.icon;
  const isPrimary = config.tone === "primary";
  const { t } = useI18n();

  return (
    <PendingButtonLink
      prefetch={false}
      href={href}
      title={t(config.labelKey)}
      aria-label={t(config.labelKey)}
      pendingLabel={compact || isPrimary ? t("patients_list.action_opening", { defaultValue: "Abrindo..." }) : null}
      className={[
        "group/action relative inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:ring-offset-2",
        "active:scale-[0.97]",
        compact ? "min-h-10 px-3 py-2" : "min-h-9 px-2.5 py-1.5",
        isPrimary
          ? "bg-brand-blue-soft text-brand-blue hover:-translate-y-0.5 hover:bg-brand-blue hover:text-white hover:shadow-md"
          : "border border-transparent text-text-secondary hover:-translate-y-0.5 hover:border-brand-blue/25 hover:bg-brand-blue/10 hover:text-brand-blue hover:shadow-sm",
        className,
      ].join(" ")}
    >
      <Icon className="h-4 w-4 transition-transform duration-200 group-hover/action:scale-110" />
      {(isPrimary || compact) && <span>{t(config.shortLabelKey)}</span>}
      <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/action:opacity-100 lg:block">
        {t(config.labelKey)}
      </span>
    </PendingButtonLink>
  );
}
