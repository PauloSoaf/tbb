"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/demo/demo-context";
import { resolveDemoPatient } from "@/demo/resolve-demo-patient";
import { demoRoutes } from "@/demo/demo-routes";
import { DemoCard, DemoSparkline, DemoStat } from "@/demo/components/DemoUi";

export default function DemoPatientEvaluationsPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const { t } = useI18n();
  const { patients, addWeight } = useDemo();
  const [newWeight, setNewWeight] = useState("");

  const patient = resolveDemoPatient(patients, patientId);
  if (!patient) notFound();

  const latest = patient.weights[patient.weights.length - 1];
  const first = patient.weights[0];
  const bmi = latest ? latest.weight / Math.pow(patient.heightCm / 100, 2) : null;
  const diff = latest && first ? latest.weight - first.weight : 0;

  const submitWeight = () => {
    const parsed = Number(newWeight.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 20 || parsed > 400) {
      toast.error(t("demo.pages.invalid_weight"));
      return;
    }
    addWeight(patient.id, parsed);
    setNewWeight("");
    toast.success(t("demo.pages.weight_saved"));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={demoRoutes.patient(patient.id)} className="rounded-xl border border-border-neutral p-2 text-text-secondary transition-colors hover:text-brand-blue" aria-label={t("demo.pages.back")}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-text-primary">{t("nav.anthropometry")}</h1>
            <p className="text-sm text-text-secondary">{patient.name}</p>
          </div>
        </div>

        {/* Ação local: adicionar peso */}
        <div className="flex gap-2">
          <input
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitWeight(); }}
            placeholder={t("demo.pages.weight_placeholder")}
            inputMode="decimal"
            className="w-32 rounded-xl border border-border-neutral bg-card-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-blue"
          />
          <button
            type="button"
            onClick={submitWeight}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover"
          >
            <Plus className="h-4 w-4" />
            {t("patient_record.sidebar.add_weight")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DemoStat label={t("demo.pages.current_weight")} value={latest ? `${latest.weight.toFixed(1)} kg` : "—"} />
        <DemoStat label="IMC" value={bmi ? bmi.toFixed(1) : "—"} />
        <DemoStat label={t("demo.pages.variation")} value={`${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg`} hint={first ? `${t("demo.pages.since")} ${first.date}` : undefined} />
        <DemoStat label={t("demo.pages.goal")} value={`${patient.goalWeight} kg`} />
      </div>

      <DemoCard title={t("demo.pages.weight_evolution")}>
        <DemoSparkline values={patient.weights.map((w) => w.weight)} className="h-28" />
        <div className="mt-2 flex justify-between text-xs text-text-secondary">
          <span>{first?.date}</span>
          <span>{latest?.date}</span>
        </div>
      </DemoCard>

      <DemoCard title={t("demo.pages.evaluation_history")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-neutral text-left text-xs uppercase tracking-wide text-text-secondary">
                <th className="py-2 pr-3">{t("demo.pages.date")}</th>
                <th className="py-2 pr-3">{t("demo.pages.weight")}</th>
                <th className="py-2 pr-3">IMC</th>
                <th className="py-2 pr-3">%G</th>
                <th className="py-2 pr-3">{t("demo.pages.waist")}</th>
                <th className="py-2">{t("demo.pages.notes")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-neutral/60">
              {patient.evaluations.map((ev) => (
                <tr key={ev.id}>
                  <td className="py-2 pr-3 font-semibold text-text-primary">{ev.date}</td>
                  <td className="py-2 pr-3 text-text-secondary">{ev.weight.toFixed(1)} kg</td>
                  <td className="py-2 pr-3 text-text-secondary">{ev.bmi.toFixed(1)}</td>
                  <td className="py-2 pr-3 text-text-secondary">{ev.bodyFat ? `${ev.bodyFat.toFixed(1)}%` : "—"}</td>
                  <td className="py-2 pr-3 text-text-secondary">{ev.waist ? `${ev.waist} cm` : "—"}</td>
                  <td className="py-2 text-text-secondary">{ev.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DemoCard>
    </div>
  );
}
