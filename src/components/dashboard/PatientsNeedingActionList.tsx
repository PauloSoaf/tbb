"use client";

import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { useI18n } from "@/lib/i18n/I18nContext";

type PatientAction = {
  patientId: string;
  patientName: string;
  reason: string;
  recommendation: string;
  href: string;
  tone: "blue" | "amber" | "rose";
};

const toneClass = {
  blue: "bg-brand-blue/10 text-brand-blue",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

export function PatientsNeedingActionList({ actions, tenant }: { actions: PatientAction[]; tenant: string }) {
  const { t } = useI18n();
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{t("dashboard.sections.patients_needing_action")}</h2>
        <p className="text-sm text-text-secondary">{t("dashboard.sections.patients_needing_action_desc")}</p>
      </div>

      {actions.length === 0 ? (
        <DashboardEmptyState
          icon={ClipboardCheck}
          title={t("dashboard.no_pending_actions")}
          description={t("dashboard.no_pending_actions_desc")}
        />
      ) : (
        <div className="space-y-2">
          {actions.map((action) => (
            <Link
              prefetch={false}
              key={`${action.reason}-${action.patientId}`}
              href={`/dashboard/${tenant}${action.href}`}
              className="block rounded-xl border border-border-neutral bg-card-bg p-3 transition-all hover:border-brand-blue/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary">{action.patientName}</p>
                  <p className="mt-0.5 text-sm text-text-secondary">{action.reason}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClass[action.tone]}`}>
                  {action.recommendation}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
