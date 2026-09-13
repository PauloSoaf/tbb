"use client";

import { X, BookOpen, Sparkles, Edit3, Copy, UserPlus, Repeat } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface WorkshopHelpPanelProps {
  onClose: () => void;
}

export function WorkshopHelpPanel({ onClose }: WorkshopHelpPanelProps) {
  const { t } = useI18n();

  const steps = [
    {
      number: 1,
      icon: Sparkles,
      text: t("meal_plan_workshop.help.step_1"),
      color: "bg-blue-50 dark:bg-blue-500/10 text-brand-blue border-blue-200 dark:border-blue-500/20",
    },
    {
      number: 2,
      icon: Edit3,
      text: t("meal_plan_workshop.help.step_2"),
      color: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
    },
    {
      number: 3,
      icon: Copy,
      text: t("meal_plan_workshop.help.step_3"),
      color: "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20",
    },
    {
      number: 4,
      icon: UserPlus,
      text: t("meal_plan_workshop.help.step_4"),
      color: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    },
    {
      number: 5,
      icon: Repeat,
      text: t("meal_plan_workshop.help.step_5"),
      color: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20",
    },
  ];

  return (
    <div className="bg-gradient-to-r from-brand-blue/5 via-blue-500/5 to-transparent rounded-2xl border border-brand-blue/20 p-5 relative animate-in fade-in slide-in-from-top-2 duration-200">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-neutral transition-colors"
        aria-label={t("meal_plan_workshop.help.close")}
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2.5 mb-3">
        <div className="p-2 rounded-xl bg-brand-blue text-white shadow-sm">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-text-primary">
            {t("meal_plan_workshop.help.title")}
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {t("meal_plan_workshop.help.intro")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.number}
              className={`p-3 rounded-xl border bg-card-bg/80 backdrop-blur-sm flex flex-col justify-between gap-2 shadow-sm ${step.color.split(" ").slice(2).join(" ")}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-neutral text-text-secondary border border-border-neutral">
                  Passo {step.number}
                </span>
                <div className={`p-1.5 rounded-lg ${step.color.split(" ").slice(0, 2).join(" ")}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xs text-text-primary font-medium leading-relaxed">
                {step.text}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-brand-blue text-white hover:bg-brand-hover transition-colors shadow-sm"
        >
          {t("meal_plan_workshop.help.close")}
        </button>
      </div>
    </div>
  );
}
