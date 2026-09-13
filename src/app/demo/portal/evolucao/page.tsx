"use client";

import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/demo/demo-context";
import { demoPatientUser } from "@/demo/demo-data";
import { DemoCard, DemoSparkline, DemoStat } from "@/demo/components/DemoUi";

export default function DemoPortalEvolutionPage() {
  const { t } = useI18n();
  const { patients, goals } = useDemo();
  const me = patients.find((p) => p.id === demoPatientUser.patientId) ?? patients[0];

  const latest = me.weights[me.weights.length - 1];
  const first = me.weights[0];
  const diff = latest && first ? latest.weight - first.weight : 0;
  const myGoals = goals.filter((g) => g.patientId === me.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-black text-text-primary">{t("nav.progress")}</h1>

      <div className="grid grid-cols-3 gap-4">
        <DemoStat label={t("demo.pages.current_weight")} value={latest ? `${latest.weight.toFixed(1)} kg` : "—"} />
        <DemoStat label={t("demo.pages.variation")} value={`${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg`} />
        <DemoStat label={t("demo.pages.goal")} value={`${me.goalWeight} kg`} />
      </div>

      <DemoCard title={t("demo.pages.weight_evolution")}>
        <DemoSparkline values={me.weights.map((w) => w.weight)} className="h-28" />
        <div className="mt-2 flex justify-between text-xs text-text-secondary">
          <span>{first?.date}</span>
          <span>{latest?.date}</span>
        </div>
      </DemoCard>

      <DemoCard title={t("patient_record.aside.goals")}>
        <div className="space-y-3">
          {myGoals.map((g) => (
            <div key={g.id}>
              <div className="mb-1 flex items-baseline justify-between">
                <p className="text-sm font-semibold text-text-primary">{g.title}</p>
                <span className="text-xs font-bold text-brand-blue">{g.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-warm">
                <div className="h-full rounded-full bg-brand-blue" style={{ width: `${g.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </DemoCard>

      <DemoCard title={t("demo.pages.history")}>
        <div className="divide-y divide-border-neutral/60">
          {[...me.weights].reverse().map((w) => (
            <div key={w.date} className="flex items-baseline justify-between py-2 text-sm">
              <span className="text-text-secondary">{w.date}</span>
              <span className="font-semibold text-text-primary">{w.weight.toFixed(1)} kg{w.bodyFat ? ` · ${w.bodyFat.toFixed(1)}%G` : ""}</span>
            </div>
          ))}
        </div>
      </DemoCard>
    </div>
  );
}
