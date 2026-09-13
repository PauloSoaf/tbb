"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Repeat } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/demo/demo-context";
import { resolveDemoPatient } from "@/demo/resolve-demo-patient";
import { demoMealPlans } from "@/demo/demo-data";
import { demoRoutes } from "@/demo/demo-routes";
import { DemoCard, DemoStat, DemoUnavailable } from "@/demo/components/DemoUi";

export default function DemoPatientPlansPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const { t } = useI18n();
  const { patients } = useDemo();

  const patient = resolveDemoPatient(patients, patientId);
  if (!patient) notFound();

  // The demo ships one rich plan; other patients reuse it as an example.
  const plan = demoMealPlans.find((pl) => pl.patientId === patient.id) ?? demoMealPlans[0];

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={demoRoutes.patient(patient.id)} className="rounded-xl border border-border-neutral p-2 text-text-secondary transition-colors hover:text-brand-blue" aria-label={t("demo.pages.back")}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-text-primary">{plan.title}</h1>
            <p className="text-sm text-text-secondary">{patient.name} · {plan.objective}</p>
          </div>
        </div>
        <DemoUnavailable notice={t("demo.notice.unavailable_in_demo")}>{t("demo.pages.export_pdf")}</DemoUnavailable>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DemoStat label="Kcal" value={String(Math.round(totals.calories))} />
        <DemoStat label={t("meal_substitutions.protein")} value={`${Math.round(totals.protein)} g`} />
        <DemoStat label={t("meal_substitutions.carbs")} value={`${Math.round(totals.carbs)} g`} />
        <DemoStat label={t("meal_substitutions.fat")} value={`${Math.round(totals.fat)} g`} />
      </div>

      {plan.meals.map((meal) => {
        const mealKcal = meal.items.reduce((s, i) => s + i.calories, 0);
        return (
          <DemoCard
            key={meal.id}
            title={
              <span className="flex items-center gap-2">
                {meal.name}
                <span className="flex items-center gap-1 text-xs font-medium text-text-secondary">
                  <Clock className="h-3.5 w-3.5" />
                  {meal.time}
                </span>
              </span>
            }
            action={<span className="text-xs font-bold text-amber-600">{Math.round(mealKcal)} kcal</span>}
          >
            <div className="divide-y divide-border-neutral/60">
              {meal.items.map((item) => (
                <div key={item.id} className="py-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold text-text-primary">
                      {item.foodName} <span className="font-normal text-text-secondary">— {item.quantity} {item.unit}</span>
                    </p>
                    <p className="shrink-0 text-xs text-text-secondary">
                      {item.calories} kcal · P {item.protein}g · C {item.carbs}g · G {item.fat}g
                    </p>
                  </div>
                  {item.substitutions && item.substitutions.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Repeat className="h-3 w-3 text-brand-blue" />
                      {item.substitutions.map((s) => (
                        <span key={s} className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[11px] font-medium text-brand-blue">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {meal.notes && <p className="mt-3 rounded-xl bg-surface-warm px-3 py-2 text-xs italic text-text-secondary">{meal.notes}</p>}
          </DemoCard>
        );
      })}
    </div>
  );
}
