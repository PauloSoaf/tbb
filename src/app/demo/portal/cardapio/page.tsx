"use client";

import { Clock, Droplets, Repeat } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { demoMealPlans } from "@/demo/demo-data";
import { DemoCard } from "@/demo/components/DemoUi";

export default function DemoPortalMealPlanPage() {
  const { t } = useI18n();
  const plan = demoMealPlans[0];

  const totals = plan.meals.reduce(
    (acc, meal) => {
      for (const item of meal.items) {
        acc.calories += item.calories;
        acc.protein += item.protein;
        acc.carbs += item.carbs;
        acc.fat += item.fat;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-black text-text-primary">{t("patient_portal.menu.title", { defaultValue: "Meu Cardápio" })}</h1>

      <DemoCard>
        <h2 className="text-sm font-bold text-text-primary">{plan.title}</h2>
        <p className="mt-1 text-sm text-brand-blue">{plan.objective}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-secondary">
          <span>Kcal: <strong className="text-amber-600">{Math.round(totals.calories)}</strong></span>
          <span>{t("meal_substitutions.protein")}: <strong className="text-emerald-600">{Math.round(totals.protein)} g</strong></span>
          <span>{t("meal_substitutions.carbs")}: <strong className="text-blue-600">{Math.round(totals.carbs)} g</strong></span>
          <span>{t("meal_substitutions.fat")}: <strong className="text-rose-500">{Math.round(totals.fat)} g</strong></span>
        </div>
      </DemoCard>

      {plan.meals.map((meal) => (
        <DemoCard
          key={meal.id}
          title={
            <span className="flex items-center gap-2">
              {meal.name}
              <span className="flex items-center gap-1 text-xs font-medium text-text-secondary">
                <Clock className="h-3.5 w-3.5" />{meal.time}
              </span>
            </span>
          }
        >
          <div className="divide-y divide-border-neutral/60">
            {meal.items.map((item) => (
              <div key={item.id} className="py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-text-primary">{item.foodName}</p>
                  <p className="shrink-0 text-xs text-text-secondary">{item.quantity} {item.unit} · <span className="font-semibold text-amber-600">{item.calories}</span> kcal</p>
                </div>
                {item.substitutions && item.substitutions.length > 0 && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Repeat className="h-3 w-3 text-brand-blue" />
                    {item.substitutions.map((s) => (
                      <span key={s} className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[11px] font-medium text-brand-blue">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {meal.notes && <p className="mt-3 rounded-xl bg-surface-warm px-3 py-2 text-xs italic text-text-secondary">{meal.notes}</p>}
        </DemoCard>
      ))}

      <DemoCard title={<span className="flex items-center gap-2"><Droplets className="h-4 w-4 text-brand-blue" />{t("demo.pages.hydration")}</span>}>
        <p className="text-sm text-text-secondary">{t("demo.pages.hydration_tip")}</p>
      </DemoCard>

      <p className="text-center text-xs text-text-secondary">{t("meal_substitutions.patient_warning")}</p>
    </div>
  );
}
